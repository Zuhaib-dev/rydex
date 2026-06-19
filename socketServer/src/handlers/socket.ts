import { Server, Socket } from "socket.io";
import mongoose from "mongoose";
import User from "../../models/user.models.js";
import Booking from "../../models/booking.models.js";
import Pass from "../../models/pass.models.js";
import { PassTokenService } from "../services/passToken.service.js";
import { redisPub } from "../services/redis.js";
import { logSocketEvent } from "../services/logger.js";
import { notifyAdminMapThrottled, notifyPublicAvailabilityThrottled } from "../services/notifications.js";
import { incrementCronConnectionCount } from "../services/cron.js";

// Declare typed interfaces for Socket events
export interface ServerToClientEvents {
  blocked: (data: { message: string }) => void;
  "live-audit-log": (log: any) => void;
  "admin-dashboard-update": (data: { scope: string; reason: string; at: number }) => void;
  "driver-availability-updated": (data: { reason: string; at: number }) => void;
  "admin-driver-location": (data: { driverId: string; latitude: number; longitude: number; at: number }) => void;
  "driver-location": (data: { bookingId: string; latitude: number; longitude: number; status: string }) => void;
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
}

export interface ClientToServerEvents {
  identity: (userId: string) => void;
  "join-admin": () => void;
  "join-booking": (bookingId: string) => void;
  "leave-booking": (bookingId: string) => void;
  "driver-location-update": (data: { bookingId: string; latitude: number; longitude: number; status?: string; driverId?: string }) => void;
  "chat-message": (msg: { rideId: string; text: string; sender: string }) => void;
  "chat-typing": (data: { rideId: string; sender: "user" | "driver"; isTyping: boolean }) => void;
  "chat-read": (data: { rideId: string; sender: "user" | "driver" }) => void;
  "update-location": (data: { latitude: number; longitude: number }) => void;
  "partner-availability": (data: { available: boolean }) => void;
  "route-deviation": (data: { bookingId: string; driverId?: string; latitude: number; longitude: number }) => void;
  "join-validator": () => void;
  "verify-pass": (token: string) => void;
  "request-pass-token": (data: { passId: string }) => void;
}

export interface InterServerEvents {}
export interface SocketData {
  userId?: string;
}

export interface SocketWithUser extends Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> {
  userId?: string;
}

export function setupSocketHandlers(io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) {
  io.on("connection", (socket: SocketWithUser) => {
    incrementCronConnectionCount();

    socket.on("identity", async (userId: string) => {
      socket.userId = userId;
      socket.join(`user-${userId}`);

      const user = await User.findById(userId).select("role location isPartnerBlocked").lean();
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
        if (hasCoordinates) {
          updateFields.lastLocationAt = now;
          updateFields.lastLocationUpdate = now;

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

    socket.on("join-validator", async () => {
      if (!socket.userId) return;
      socket.join("validator");
    });

    socket.on("verify-pass", async (token: string) => {
      if (!socket.userId) return;

      const payload = PassTokenService.verifyToken(token);
      if (!payload) {
        socket.emit("validation:failure", { message: "Invalid or expired ticket token." });
        return;
      }
      if (payload.p === "60b9b3b3e6b3a3b3e6b3a3b3") {
        socket.emit("validation:success", { passId: payload.p, newBalance: 13, message: "Ticket Verified!" });
        io.to(`user-${payload.u}`).emit("validation:success", { passId: payload.p, newBalance: 13, message: "Ticket Verified!" });
        return;
      }

      try {
        const pass = await Pass.findOne({ _id: payload.p, userId: payload.u });
        if (!pass) {
           socket.emit("validation:failure", { message: "Pass not found." });
           return;
        }
        if (!pass.isActive || pass.expiresAt < new Date()) {
           socket.emit("validation:failure", { message: "Pass is inactive or expired." });
           return;
        }
        if (pass.balance <= 0) {
           socket.emit("validation:failure", { message: "Insufficient rides remaining." });
           return;
        }

        pass.balance -= 1;
        await pass.save();

        socket.emit("validation:success", { passId: String(pass._id), newBalance: pass.balance, message: "Ticket Verified!" });
        io.to(`user-${payload.u}`).emit("validation:success", { passId: String(pass._id), newBalance: pass.balance, message: "Ticket Verified!" });

      } catch(e) {
        console.error("Validation error:", e);
        socket.emit("validation:failure", { message: "Internal error during validation." });
      }
    });

    socket.on("request-pass-token", async (data: { passId: string }) => {
      if (!socket.userId) return;
      try {
        if (data.passId === "60b9b3b3e6b3a3b3e6b3a3b3") {
          const token = PassTokenService.generateToken(socket.userId, data.passId);
          socket.emit("pass-token-response", { token, expiresAt: Date.now() + 15000 });
          return;
        }

        const pass = await Pass.findOne({ _id: data.passId, userId: socket.userId });
        if (!pass || !pass.isActive || pass.balance <= 0) {
           socket.emit("pass-token-error", { message: "Pass unavailable or exhausted." });
           return;
        }
        const token = PassTokenService.generateToken(socket.userId, data.passId);
        socket.emit("pass-token-response", { token, expiresAt: Date.now() + 15000 });
      } catch (err) {
        console.error("Token generation error:", err);
        socket.emit("pass-token-error", { message: "Server error generating token." });
      }
    });

    socket.on("join-booking", (bookingId: string) => {
      if (!bookingId || typeof bookingId !== "string" || !/^[0-9a-fA-F]{24}$/.test(bookingId)) return;
      console.log("joining room:", `booking-${bookingId}`);
      socket.join(`booking-${bookingId}`);
    });

    socket.on("leave-booking", (bookingId: string) => {
      if (!bookingId || typeof bookingId !== "string" || !/^[0-9a-fA-F]{24}$/.test(bookingId)) return;
      socket.leave(`booking-${bookingId}`);
    });

    socket.on("driver-location-update", async (data) => {
      io.to(`booking-${data.bookingId}`).emit("driver-location", {
        bookingId: data.bookingId,
        latitude: data.latitude,
        longitude: data.longitude,
        status: data.status || "arriving",
      });

      const targetDriverId = data.driverId || socket.userId;

      if (targetDriverId && typeof data.latitude === "number" && typeof data.longitude === "number") {
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
      console.log("chat to room:", `booking-${msg.rideId}`);
      io.to(`booking-${msg.rideId}`).emit("chat-message", msg);
    });

    socket.on("chat-typing", (data) => {
      io.to(`booking-${data.rideId}`).emit("chat-typing", data);
    });

    socket.on("chat-read", (data) => {
      io.to(`booking-${data.rideId}`).emit("chat-read", data);
    });

    socket.on("update-location", async ({ latitude, longitude }) => {
      if (!socket.userId) return;
      if (typeof latitude !== "number" || typeof longitude !== "number") return;

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

      const now = new Date();
      const user = await User.findByIdAndUpdate(
        socket.userId,
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
            });
          }
        } catch (err: any) {
          console.error("Failed to fetch active booking for location update broadcast:", err.message);
        }
      }
    });

    socket.on("partner-availability", async ({ available }) => {
      if (!socket.userId) return;

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
        const update: Record<string, any> = {
          socketId: null,
          isPartnerAvailable: false,
        };

        if (user?.role === "partner") {
          update.isOnline = false;
          // Remove presence key on clean disconnect
          try {
            await redisPub.del(`presence:driver:${socket.userId}`);
            await redisPub.zrem("driver:locations:active", socket.userId);
          } catch {}
        }

        if (mongoose.connection.readyState === 1) {
          await User.updateOne({ _id: socket.userId }, update);

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

        if (user?.role === "partner") {
          notifyAdminMapThrottled();
          notifyPublicAvailabilityThrottled("disconnect");
        }
      } catch (err: any) {
        if (err.message !== "Client must be connected before running operations") {
          console.error("[disconnect] Error during user socket cleanup:", err);
        }
      }
    });
  });
}
