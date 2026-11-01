import { Server, Socket } from "socket.io";
import mongoose from "mongoose";
import { createHmac, timingSafeEqual } from "node:crypto";
import User from "../../models/user.models.js";
import Booking from "../../models/booking.models.js";
import Pass from "../../models/pass.models.js";
import { PassTokenService } from "../services/passToken.service.js";
import { redisPub } from "../services/redis.js";
import { logSocketEvent } from "../services/logger.js";
import { notifyAdminMapThrottled, notifyPublicAvailabilityThrottled } from "../services/notifications.js";
import { incrementCronConnectionCount } from "../services/cron.js";

const activeAudioBroadcasts = new Map<string, { token: string, expires: number }>();
const LIVE_LOCATION_MAX_AGE_MS = 45_000;
const MAX_LOCATION_ACCURACY_METERS = 150;

// Declare typed interfaces for Socket events
export interface ServerToClientEvents {
  blocked: (data: { message: string }) => void;
  "live-audit-log": (log: any) => void;
  "admin-dashboard-update": (data: { scope: string; reason: string; at: number }) => void;
  "driver-availability-updated": (data: { reason: string; at: number }) => void;
  "admin-driver-location": (data: { driverId: string; latitude: number; longitude: number; at: number }) => void;
  "driver-location": (data: { bookingId: string; latitude: number; longitude: number; status: string; speedKmh?: number; heading?: number | null; accuracy?: number; at: number }) => void;
  "chat-message": (msg: any) => void;
  "chat-typing": (data: { rideId: string; sender: "user" | "driver"; isTyping: boolean }) => void;
  "chat-read": (data: { rideId: string; sender: "user" | "driver" }) => void;
  "system-telemetry-update": (payload: any) => void;
  "new-booking": (data: any) => void;
  "booking-updated": (data: any) => void;
  "validation:success": (data: { passId: string; newBalance: number; message: string }) => void;
  "validation:failure": (data: { message: string }) => void;
  "pass-token-response": (data: { token: string; expiresAt: number }) => void;
  "pass-token-error": (data: { message: string }) => void;
  "audio-token-received": (token: string) => void;
}

export interface ClientToServerEvents {
  identity: (userId: string) => void;
  "join-admin": () => void;
  "join-booking": (bookingId: string, acknowledge?: (joined: boolean) => void) => void;
  "leave-booking": (bookingId: string) => void;
  "driver-location-update": (data: { bookingId: string; latitude: number; longitude: number; status?: string; driverId?: string; speedKmh?: number; heading?: number | null; accuracy?: number; at?: number }) => void;
  "chat-message": (msg: { rideId: string; text: string; sender: string }) => void;
  "chat-typing": (data: { rideId: string; sender: "user" | "driver"; isTyping: boolean }) => void;
  "chat-read": (data: { rideId: string; sender: "user" | "driver" }) => void;
  "update-location": (data: { latitude: number; longitude: number; accuracy?: number; speedKmh?: number; heading?: number | null; at?: number }) => void;
  "partner-availability": (data: { available: boolean }) => void;
  "partner-heartbeat": () => void;
  "route-deviation": (data: { bookingId: string; driverId?: string; latitude: number; longitude: number }) => void;
  "join-validator": () => void;
  "verify-pass": (data: { token: string; bookingId: string }) => void;
  "request-pass-token": (data: { passId: string }) => void;
  "audio-broadcast-start": (token: string) => void;
  "audio-receive-trigger": () => void;
}

export interface InterServerEvents {}
export interface SocketData {
  userId?: string;
}

export interface SocketWithUser extends Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> {
  userId?: string;
  authenticated?: boolean;
}

function verifySocketToken(token: unknown, secret: string) {
  if (typeof token !== "string") return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;

  const expected = createHmac("sha256", secret).update(payload).digest();
  let received: Buffer;
  try {
    received = Buffer.from(signature, "base64url");
  } catch {
    return null;
  }
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;

  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      sub?: unknown;
      exp?: unknown;
    };
    if (
      typeof claims.sub !== "string" || !/^[0-9a-fA-F]{24}$/.test(claims.sub) ||
      typeof claims.exp !== "number" || claims.exp <= Math.floor(Date.now() / 1000)
    ) return null;
    return claims.sub;
  } catch {
    return null;
  }
}

export function setupSocketHandlers(io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) {
  io.use((rawSocket, next) => {
    const socket = rawSocket as SocketWithUser;
    if (socket.handshake.auth?.socketAuthError) {
      next(new Error("Socket authentication service unavailable"));
      return;
    }
    const token = socket.handshake.auth?.token;
    if (token === undefined || token === null || token === "") {
      socket.authenticated = false;
      next(); // Public availability events can use an anonymous connection.
      return;
    }

    const secret = process.env.SOCKET_INTERNAL_SECRET;
    const userId = secret ? verifySocketToken(token, secret) : null;
    if (!userId) {
      next(new Error("Invalid or expired socket session"));
      return;
    }
    socket.userId = userId;
    socket.authenticated = true;
    next();
  });

  io.on("connection", (socket: SocketWithUser) => {
    incrementCronConnectionCount();

    socket.on("identity", async (userId: string) => {
      // The ID is only a claim; the signed handshake is the authority.
      if (!socket.authenticated || !socket.userId || userId !== socket.userId) return;
      socket.join(`user-${userId}`);

      const user = await User.findById(userId).select("role location lastLocationAt isPartnerBlocked").lean();
      if (!user) return;

      if (user.isPartnerBlocked) {
        socket.emit("blocked", { message: "Your account is suspended." });
        socket.disconnect(true);
        return;
      }

      await logSocketEvent(
        "user_connected",
        `User identified on socket: ${userId} (${user.role})`,
        "info",
        "auth",
        userId,
        userId,
        "User"
      );

      const now = new Date();
      const updateFields: Record<string, any> = {
        socketId: socket.id,
        isOnline: true,
      };

      if (user.role === "admin") {
        socket.join("admin-dashboard");
      }

      if (user.role === "partner") {
        // Set driver presence in Redis (60s TTL for lag resilience)
        await redisPub.set(`presence:driver:${userId}`, "online", "EX", 60);

        updateFields.isPartnerAvailable = true;

        const hasCoordinates = user.location?.coordinates && user.location.coordinates.length === 2;
        const locationAge = user.lastLocationAt ? now.getTime() - new Date(user.lastLocationAt).getTime() : Infinity;
        if (hasCoordinates && locationAge >= 0 && locationAge <= LIVE_LOCATION_MAX_AGE_MS) {
          const [longitude, latitude] = user.location.coordinates;
          // Seed driver location in GeoSet immediately so they are instantly discoverable
          await redisPub.geoadd("driver:locations:active", longitude, latitude, userId);

          // Notify admin map of the driver location immediately
          io.to("admin-dashboard").emit("admin-driver-location", {
            driverId: String(user._id),
            latitude,
            longitude,
            at: now.getTime(),
          });
          notifyAdminMapThrottled();
          notifyPublicAvailabilityThrottled("location");
        }
      }

      await User.updateOne({ _id: userId }, updateFields);
    });

    socket.on("join-admin", async () => {
      if (!socket.userId) return;

      const user = await User.findById(socket.userId).select("role").lean();
      if (user?.role === "admin") {
        socket.join("admin-dashboard");
      }
    });

    socket.on("partner-heartbeat", async () => {
      if (!socket.userId) return;
      try {
        const partner = await User.findOne({
          _id: socket.userId,
          role: "partner",
          partnerStatus: "approved",
          isPartnerBlocked: { $ne: true },
        }).select("_id").lean();
        if (!partner) return;

        // Keep presence alive without pretending an old GPS fix is new.
        await redisPub.set(`presence:driver:${socket.userId}`, "online", "EX", 60);
      } catch (err) {
        console.error("Partner presence heartbeat failed:", err);
      }
    });

    socket.on("join-validator", async () => {
      if (!socket.userId) return;
      socket.join("validator");
    });

    socket.on("audio-broadcast-start", (token: string) => {
      if (!socket.userId) return;
      activeAudioBroadcasts.set(socket.id, { token, expires: Date.now() + 5000 });
    });

    socket.on("audio-receive-trigger", () => {
      if (!socket.userId) return;
      const now = Date.now();
      for (const [id, broadcast] of activeAudioBroadcasts.entries()) {
          if (broadcast.expires > now) {
              socket.emit("audio-token-received", broadcast.token);
              return;
          } else {
              activeAudioBroadcasts.delete(id);
          }
      }
    });

    socket.on("verify-pass", async (data: { token: string; bookingId: string }) => {
      if (!socket.userId) return;

      const payload = PassTokenService.verifyToken(data?.token);
      if (!payload) {
        socket.emit("validation:failure", { message: "Invalid or expired ticket token." });
        return;
      }
      if (!/^[0-9a-fA-F]{24}$/.test(data?.bookingId || "")) {
        socket.emit("validation:failure", { message: "Open pass validation from an active ride." });
        return;
      }
      try {
        const validator = await User.findOne({
          _id: socket.userId,
          role: "partner",
          partnerStatus: "approved",
          isPartnerBlocked: { $ne: true },
        }).select("_id").lean();
        if (!validator) {
          socket.emit("validation:failure", { message: "Only approved partners can validate passes." });
          return;
        }

        const bookingFilter = {
          _id: data.bookingId,
          driver: socket.userId,
          user: payload.u,
          paymentStatus: "pass",
        };
        const booking = await Booking.findOne(bookingFilter).lean();
        if (!booking || (booking.status !== "awaiting_payment" && booking.status !== "completed")) {
          socket.emit("validation:failure", { message: "This pass does not match an active ride for this rider." });
          return;
        }

        const pass = await Pass.findOne({ _id: payload.p, userId: payload.u });
        if (!pass) {
           socket.emit("validation:failure", { message: "Pass not found." });
           return;
        }
        const alreadyRedeemed = pass.redeemedBookingIds?.some((id: mongoose.Types.ObjectId) => String(id) === data.bookingId) ?? false;
        let remainingBalance = pass.balance;
        if (!alreadyRedeemed) {
          const now = new Date();
          if (!pass.isActive || pass.expiresAt <= now) {
            socket.emit("validation:failure", { message: "Pass is inactive or expired." });
            return;
          }
          if (pass.balance <= 0) {
            socket.emit("validation:failure", { message: "Insufficient rides remaining." });
            return;
          }

          // One atomic ledger entry per booking prevents overspending and replay
          // of a QR token for the same ride.
          const consumedPass = await Pass.findOneAndUpdate(
            {
              _id: pass._id,
              userId: payload.u,
              isActive: true,
              expiresAt: { $gt: now },
              balance: { $gt: 0 },
              redeemedBookingIds: { $ne: data.bookingId },
              redeemedTokenIds: { $ne: payload.j },
            },
            {
              $inc: { balance: -1 },
              $addToSet: {
                redeemedBookingIds: data.bookingId,
                redeemedTokenIds: payload.j,
              },
            },
            { new: true },
          );
          if (!consumedPass) {
            // A parallel scan of this same booking may have won the atomic
            // update. Treat that as an idempotent retry, but reject reuse for
            // any different booking.
            const latestPass = await Pass.findOne({
              _id: pass._id,
              userId: payload.u,
              redeemedBookingIds: data.bookingId,
            });
            if (!latestPass) {
              socket.emit("validation:failure", { message: "Pass is no longer active or has no rides remaining." });
              return;
            }
            remainingBalance = latestPass.balance;
          } else {
            remainingBalance = consumedPass.balance;
            if (remainingBalance === 0) {
              await Pass.updateOne({ _id: consumedPass._id, balance: 0 }, { $set: { isActive: false } });
            }
          }
        }

        const completedAt = booking.passRedeemedAt && booking.status === "completed"
          ? booking.completedAt ?? booking.passRedeemedAt
          : new Date();
        const completedBooking = booking.status === "completed" && String(booking.passId) === String(pass._id)
          ? booking
          : await Booking.findOneAndUpdate(
              { ...bookingFilter, status: "awaiting_payment" },
              { $set: { status: "completed", completedAt, passId: pass._id, passRedeemedAt: completedAt } },
              { new: true },
            );
        if (!completedBooking) {
          socket.emit("validation:failure", { message: "Pass was validated, but the ride changed. Please retry validation." });
          return;
        }

        const result = { passId: String(pass._id), newBalance: remainingBalance, message: "Ticket Verified!" };
        socket.emit("validation:success", result);
        io.to(`user-${payload.u}`).emit("validation:success", result);
        const bookingUpdate = {
          bookingId: data.bookingId,
          status: "completed",
          paymentStatus: "pass",
          paymentMethod: "pass",
          completedAt: completedAt.toISOString(),
          at: Date.now(),
        };
        io.to(`booking-${data.bookingId}`).emit("booking-updated", bookingUpdate);
        notifyAdminMapThrottled();

      } catch(e) {
        console.error("Validation error:", e);
        socket.emit("validation:failure", { message: "Internal error during validation." });
      }
    });

    socket.on("request-pass-token", async (data: { passId: string }) => {
      if (!socket.userId) return;
      try {
        const pass = await Pass.findOne({ _id: data.passId, userId: socket.userId });
        if (!pass || !pass.isActive || pass.balance <= 0 || pass.expiresAt <= new Date()) {
           socket.emit("pass-token-error", { message: "Pass unavailable, expired, or exhausted." });
           return;
        }
        const token = PassTokenService.generateToken(socket.userId, data.passId);
        socket.emit("pass-token-response", { token, expiresAt: Date.now() + 15000 });
      } catch (err) {
        console.error("Token generation error:", err);
        socket.emit("pass-token-error", { message: "Server error generating token." });
      }
    });

    socket.on("join-booking", async (bookingId: string, acknowledge?: (joined: boolean) => void) => {
      const reply = (joined: boolean) => {
        if (typeof acknowledge === "function") acknowledge(joined);
      };
      if (!bookingId || typeof bookingId !== "string" || !/^[0-9a-fA-F]{24}$/.test(bookingId)) {
        reply(false);
        return;
      }
      if (!socket.userId) {
        reply(false);
        return;
      }
      try {
        const booking = await Booking.findOne({
          _id: bookingId,
          $or: [{ user: socket.userId }, { driver: socket.userId }],
        }).select("driver").lean();
        if (!booking) {
          reply(false);
          return;
        }
        await socket.join(`booking-${bookingId}`);
        if (String(booking.driver) === String(socket.userId)) {
          await socket.join(`booking-driver-${bookingId}`);
        }
        reply(true);
      } catch (err) {
        console.error("Failed to authorize booking room join:", err);
        reply(false);
      }
    });

    socket.on("leave-booking", (bookingId: string) => {
      if (!bookingId || typeof bookingId !== "string" || !/^[0-9a-fA-F]{24}$/.test(bookingId)) return;
      socket.leave(`booking-${bookingId}`);
      socket.leave(`booking-driver-${bookingId}`);
    });

    socket.on("driver-location-update", async (data) => {
      const bookingId = typeof data?.bookingId === "string" ? data.bookingId : "";
      if (!socket.userId || !/^[0-9a-fA-F]{24}$/.test(bookingId)) return;
      if (!socket.rooms.has(`booking-driver-${bookingId}`)) return;
      if (data.driverId && String(data.driverId) !== String(socket.userId)) return;
      if (
        typeof data.latitude !== "number" || !Number.isFinite(data.latitude) || Math.abs(data.latitude) > 90 ||
        typeof data.longitude !== "number" || !Number.isFinite(data.longitude) || Math.abs(data.longitude) > 180
      ) return;

      const receivedAt = Date.now();
      const fixAt = typeof data.at === "number" && Number.isFinite(data.at) ? data.at : receivedAt;
      if (fixAt > receivedAt + 5_000 || receivedAt - fixAt > 20_000) return;
      if (
        typeof data.accuracy === "number" &&
        Number.isFinite(data.accuracy) &&
        data.accuracy > MAX_LOCATION_ACCURACY_METERS
      ) return;

      const at = receivedAt;
      const speedKmh = typeof data.speedKmh === "number" && Number.isFinite(data.speedKmh)
        ? Math.max(0, Math.min(160, data.speedKmh))
        : undefined;
      const heading = typeof data.heading === "number" && Number.isFinite(data.heading)
        ? ((data.heading % 360) + 360) % 360
        : null;
      const accuracy = typeof data.accuracy === "number" && Number.isFinite(data.accuracy)
        ? Math.max(0, Math.min(10_000, data.accuracy))
        : undefined;

      io.to(`booking-${data.bookingId}`).emit("driver-location", {
        bookingId: data.bookingId,
        latitude: data.latitude,
        longitude: data.longitude,
        status: data.status || "arriving",
        ...(speedKmh !== undefined ? { speedKmh } : {}),
        heading,
        ...(accuracy !== undefined ? { accuracy } : {}),
        at,
      });

      const targetDriverId = socket.userId;

      if (targetDriverId) {
        const now = new Date();

        // Throttle DB/Redis writes to once every 4 seconds per driver
        const throttleKey = `lock:dbwrite:location:${targetDriverId}`;
        try {
          const isThrottled = await redisPub.get(throttleKey);
          if (isThrottled) {
            return;
          }
          await redisPub.set(throttleKey, "1", "EX", 4);
        } catch (err) {
          console.error("DB write throttle error:", err);
        }

        try {
          await User.updateOne(
            { _id: targetDriverId },
            {
              location: {
                type: "Point",
                coordinates: [data.longitude, data.latitude],
              },
              lastLocationAt: now,
              lastLocationUpdate: now,
            }
          );
          await redisPub.geoadd("driver:locations:active", data.longitude, data.latitude, targetDriverId);
          io.to("admin-dashboard").emit("admin-driver-location", {
            driverId: String(targetDriverId),
            latitude: data.latitude,
            longitude: data.longitude,
            at: now.getTime(),
          });
          notifyAdminMapThrottled();
        } catch (err: any) {
          console.error("Failed to update driver location in DB/Redis on driver-location-update:", err.message);
        }
      }
    });

    socket.on("route-deviation", async (data) => {
      if (
        !socket.userId ||
        !data?.bookingId ||
        !socket.rooms.has(`booking-driver-${data.bookingId}`) ||
        (data.driverId && data.driverId !== socket.userId) ||
        !Number.isFinite(data.latitude) || Math.abs(data.latitude) > 90 ||
        !Number.isFinite(data.longitude) || Math.abs(data.longitude) > 180
      ) return;
      console.warn(`[Route Deviation] Driver ${data.driverId} went off route on booking ${data.bookingId} at lat:${data.latitude}, lng:${data.longitude}`);
      io.to("admin-dashboard").emit("system-telemetry-update", {
        type: "ROUTE_DEVIATION",
        message: `Driver deviated from route`,
        bookingId: data.bookingId,
        driverId: data.driverId,
        latitude: data.latitude,
        longitude: data.longitude,
        timestamp: Date.now(),
      });
    });

    socket.on("chat-message", (msg) => {
      if (!socket.userId || !msg?.rideId || !socket.rooms.has(`booking-${msg.rideId}`)) return;
      const sender = socket.rooms.has(`booking-driver-${msg.rideId}`) ? "driver" : "user";
      console.log("chat to room:", `booking-${msg.rideId}`);
      io.to(`booking-${msg.rideId}`).emit("chat-message", { ...msg, sender });
    });

    socket.on("chat-typing", (data) => {
      if (!socket.userId || !data?.rideId || !socket.rooms.has(`booking-${data.rideId}`)) return;
      const sender = socket.rooms.has(`booking-driver-${data.rideId}`) ? "driver" : "user";
      io.to(`booking-${data.rideId}`).emit("chat-typing", { ...data, sender });
    });

    socket.on("chat-read", (data) => {
      if (!socket.userId || !data?.rideId || !socket.rooms.has(`booking-${data.rideId}`)) return;
      const sender = socket.rooms.has(`booking-driver-${data.rideId}`) ? "driver" : "user";
      io.to(`booking-${data.rideId}`).emit("chat-read", { ...data, sender });
    });

    socket.on("update-location", async ({ latitude, longitude, accuracy, at }) => {
      if (!socket.userId) return;
      if (
        typeof latitude !== "number" || !Number.isFinite(latitude) || Math.abs(latitude) > 90 ||
        typeof longitude !== "number" || !Number.isFinite(longitude) || Math.abs(longitude) > 180
      ) return;

      const receivedAt = Date.now();
      const fixAt = typeof at === "number" && Number.isFinite(at) ? at : receivedAt;
      if (fixAt > receivedAt + 5_000 || receivedAt - fixAt > 20_000) return;
      if (typeof accuracy === "number" && Number.isFinite(accuracy) && accuracy > MAX_LOCATION_ACCURACY_METERS) return;

      // Rate Limit Check: Max 10 location updates per 5 seconds (average 2/sec)
      const timestamp = Date.now();
      const rateLimitKey = `rate:limit:location:${socket.userId}`;
      try {
        const pipeline = redisPub.multi();
        pipeline.zremrangebyscore(rateLimitKey, 0, timestamp - 5000);
        pipeline.zcard(rateLimitKey);
        pipeline.zadd(rateLimitKey, timestamp, `${timestamp}-${Math.random()}`);
        pipeline.expire(rateLimitKey, 6);

        const results = await pipeline.exec();
        if (results && results[1]) {
          const count = results[1][1] as number;
          if (count >= 10) {
            console.warn(`[RateLimiter] Driver ${socket.userId} throttled on update-location.`);
            return; // Ignore update
          }
        }
      } catch (err) {
        console.error("Rate Limiter error on location update:", err);
      }

      const now = new Date(receivedAt);
      const user = await User.findByIdAndUpdate(
        { _id: socket.userId, role: "partner" },
        {
          location: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
          lastLocationAt: now,
          lastLocationUpdate: now,
        },
        { returnDocument: "after", select: "role" }
      ).lean();

      if (user?.role === "partner") {
        // Refresh Redis presence heartbeat (60s TTL)
        await redisPub.set(`presence:driver:${socket.userId}`, "online", "EX", 60);

        // Store coordinate in Redis active driver locations GeoSet
        await redisPub.geoadd("driver:locations:active", longitude, latitude, socket.userId);

        io.to("admin-dashboard").emit("admin-driver-location", {
          driverId: String(user._id),
          latitude,
          longitude,
          at: now.getTime(),
        });
        notifyAdminMapThrottled();
        notifyPublicAvailabilityThrottled("location");

        // Broadcast to active booking if present
        try {
          const activeBooking = await Booking.findOne({
            driver: socket.userId,
            status: { $in: ["confirmed", "arriving", "arrived", "started"] },
          }).select("_id status").lean();

          if (activeBooking) {
            io.to(`booking-${activeBooking._id}`).emit("driver-location", {
              bookingId: String(activeBooking._id),
              latitude,
              longitude,
              status: activeBooking.status,
              at: now.getTime(),
            });
          }
        } catch (err: any) {
          console.error("Failed to fetch active booking for location update broadcast:", err.message);
        }
      }
    });

    socket.on("partner-availability", async ({ available }) => {
      if (!socket.userId) return;

      const partner = await User.findOne({
        _id: socket.userId,
        role: "partner",
        partnerStatus: "approved",
        isPartnerBlocked: { $ne: true },
      }).select("_id").lean();
      if (!partner) return;

      const isAvailable = Boolean(available);

      if (isAvailable) {
        await redisPub.set(`presence:driver:${socket.userId}`, "online", "EX", 60);
      } else {
        await redisPub.del(`presence:driver:${socket.userId}`);
        await redisPub.zrem("driver:locations:active", socket.userId);
      }

      await User.updateOne(
        { _id: socket.userId },
        {
          isPartnerAvailable: isAvailable,
          isOnline: isAvailable,
        }
      );
      notifyPublicAvailabilityThrottled("availability");
    });

    socket.on("disconnect", async () => {
      if (!socket.userId) return;

      try {
        if (mongoose.connection.readyState !== 1) {
          return;
        }

        const user = await User.findById(socket.userId).select("role").lean();
        if (user?.role === "partner") {
          // Socket.IO can briefly disconnect during a network handoff, or one
          // tab can close while another stays open. Keep partner presence until
          // the Redis heartbeat expires instead of hiding the marker at once.
          await User.updateOne(
            { _id: socket.userId, socketId: socket.id },
            { $set: { socketId: null } },
          );
        } else {
          await User.updateOne(
            { _id: socket.userId, socketId: socket.id },
            { $set: { socketId: null } },
          );
        }

        if (mongoose.connection.readyState === 1) {
          await logSocketEvent(
            "user_disconnected",
            `User identified socket disconnected: ${socket.userId}`,
            "info",
            "auth",
            socket.userId,
            socket.userId,
            "User"
          );
        }

      } catch (err: any) {
        if (err.message !== "Client must be connected before running operations") {
          console.error("[disconnect] Error during user socket cleanup:", err);
        }
      }
    });
  });
}
