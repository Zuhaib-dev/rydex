import express, { Request, Response } from "express";
import http from "http";
import dotenv from "dotenv";
import { Server } from "socket.io";
import axios from "axios";
import { createAdapter } from "@socket.io/redis-adapter";
import User from "./models/user.models.js";
import { redisPub, redisSub, socketPub, socketSub } from "./src/services/redis.js";
import { connectDatabase } from "./src/services/db.js";
import { logSocketEvent, setIoForLogging } from "./src/services/logger.js";
import { setIoForNotifications } from "./src/services/notifications.js";
import { activeTimers } from "./src/services/timers.js";
import { startCronServices } from "./src/services/cron.js";
import { requireSocketSecret } from "./src/middleware/auth.js";
import { setupRedisSub } from "./src/handlers/redisSub.js";
import { setupSocketHandlers } from "./src/handlers/socket.js";
import { sendPushNotification } from "./src/services/fcm.js";

dotenv.config();

const app = express();
app.use(express.json());
const server = http.createServer(app);
const port = process.env.PORT || 8000;

// Mongoose & Database cleanup
if (process.env.NODE_ENV !== "test") {
  await connectDatabase();
}

const normalizeOrigin = (origin: string | undefined) => origin?.replace(/\/+$/, "");
const allowedOrigins = [
  process.env.NEXT_BASE_URL,
  process.env.CLIENT_URL,
  "https://rydexx.netlify.app",
  "http://localhost:3000",
]
  .filter(Boolean)
  .map(normalizeOrigin);

// Setup Socket.IO Server
const io = new Server(server, {
  cors: {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(normalizeOrigin(origin))) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} is not allowed by Socket.IO CORS`));
    },
    methods: ["GET", "POST"],
  },
});

// Configure Socket.IO Redis Adapter for horizontal scalability
try {
  io.adapter(createAdapter(socketPub, socketSub));
  console.log("Socket.IO Redis Adapter configured successfully.");
} catch (error) {
  console.error("Failed to configure Socket.IO Redis Adapter:", error);
}

// Wire up Socket.IO reference to logging and notifications services
setIoForLogging(io);
setIoForNotifications(io);

// Setup handlers
setupRedisSub();
setupSocketHandlers(io);

// Express HTTP Routes
app.get("/", (req: Request, res: Response) => {
  res.json({ success: true, service: "rydex-socket-server" });
});

app.get("/health", (req: Request, res: Response) => {
  res.json({ success: true, clientsCount: io.engine.clientsCount });
});

// Secure endpoint to broadcast to admins
app.post("/emit-admin", requireSocketSecret, (req: Request, res: Response) => {
  const { event = "admin-dashboard-update", data } = req.body ?? {};
  try {
    io.to("admin-dashboard").emit(event as any, data);
    res.json({ success: true });
  } catch (error) {
    console.error("Emit-admin handler error:", error);
    res.status(500).json({ success: false });
  }
});

// Internal helper helper to send message to room
function emitToBookingRoom(bookingId: string, event: string, data: any) {
  if (!bookingId) return;
  const room = `booking-${String(bookingId)}`;
  io.to(room).emit(event as any, data);
}

// Express route for booking and notification updates
app.post("/emit", requireSocketSecret, async (req: Request, res: Response) => {
  const { userId, event, data, bookingId: roomFromBody } = req.body;
  const bookingRoomId = roomFromBody || data?.bookingId;

  try {
    // Emit to personal user room
    if (userId) {
      io.to(`user-${userId}`).emit(event as any, data);
      
      if (event === "blocked") {
        // Disconnect all sockets in this user's room
        const userRoom = io.sockets.adapter.rooms.get(`user-${userId}`);
        if (userRoom) {
          for (const socketId of userRoom) {
            const socketToDisconnect = io.sockets.sockets.get(socketId);
            if (socketToDisconnect) socketToDisconnect.disconnect(true);
          }
        }
      }

      // Send Push Notification if FCM tokens exist
      if (event === "new-booking" || event === "booking-updated" || event === "new-notification") {
        const targetUser = await User.findById(userId).select("fcmTokens").lean();
        if (targetUser && targetUser.fcmTokens && targetUser.fcmTokens.length > 0) {

          const { title, body, url } = buildPushContent(event, data, bookingRoomId);

          const pushResult = await sendPushNotification(targetUser.fcmTokens as string[], title, body, {
            bookingId: String(bookingRoomId || ""),
            event,
            notificationId: data?._id ? String(data._id) : "",
            url,
          });

          if (pushResult.invalidTokens.length > 0) {
            await User.updateOne(
              { _id: userId },
              { $pull: { fcmTokens: { $in: pushResult.invalidTokens } } },
            );
          }
        }
      }
    }

    if (bookingRoomId) {
      emitToBookingRoom(bookingRoomId, event, data);
    }

    // Matchmaker queue countdown hook
    if (event === "new-booking" && data?._id && data?.driver) {
      const bookingId = String(data._id);
      const driverId = String(data.driver);

      // Clear any existing timers for this booking
      if (activeTimers.has(bookingId)) {
        clearTimeout(activeTimers.get(bookingId)!);
        activeTimers.delete(bookingId);
      }

      console.log(`Starting 40s matchmaker countdown for booking ${bookingId}, targeting driver ${driverId}`);

      // Primary: Redis key expiration (crash-resilient across server restarts)
      let redisTimerSet = false;
      try {
        await redisPub.set(`dispatch:timer:${bookingId}`, "1", "EX", 40);
        await redisPub.set(`dispatch:driver:${bookingId}`, driverId, "EX", 45);
        redisTimerSet = true;
        console.log(`[RedisDispatch] Set dispatch:timer:${bookingId} (40s TTL)`);
      } catch (err: any) {
        console.warn(`[RedisDispatch] Redis timer unavailable, using in-memory fallback:`, err.message);
      }

      // Fallback: in-memory setTimeout (works when Redis keyspace events unavailable)
      const timer = setTimeout(async () => {
        try {
          const cascadeLockKey = `cascade:lock:${bookingId}`;
          let lockAcquired = false;
          try {
            const result = await redisPub.set(cascadeLockKey, "1", "EX", 30, "NX");
            lockAcquired = result === "OK";
          } catch {
            lockAcquired = true;
          }

          if (!lockAcquired) {
            console.log(`[InMemoryTimer] Cascade already handled by Redis path for ${bookingId}. Skipping.`);
            return;
          }

          console.log(`[InMemoryTimer] Booking ${bookingId} dispatch timed out. Triggering cascade...`);
          const nextBaseUrl = process.env.NEXT_BASE_URL || "http://localhost:3000";
          const cascadeSecret = process.env.CASCADE_INTERNAL_SECRET;
          await axios.post(
            `${nextBaseUrl.replace(/\/+$/, "")}/api/booking/${bookingId}/cascade`,
            { driverId },
            {
              timeout: 10000,
              ...(cascadeSecret ? { headers: { "x-cascade-secret": cascadeSecret } } : {}),
            }
          );
        } catch (err: any) {
          console.warn(`[InMemoryTimer] Cascade error for booking ${bookingId}:`, err.message);
        } finally {
          activeTimers.delete(bookingId);
        }
      }, 40000);

      activeTimers.set(bookingId, timer);
    } else if (event === "booking-updated" && data?.bookingId && data?.status) {
      const bookingId = String(data.bookingId);
      const status = String(data.status);

      if (status !== "requested" && activeTimers.has(bookingId)) {
        console.log(`Clearing matchmaking timer for booking ${bookingId} (status updated to ${status})`);
        clearTimeout(activeTimers.get(bookingId)!);
        activeTimers.delete(bookingId);
        redisPub.del(`dispatch:timer:${bookingId}`).catch(() => {});
        redisPub.del(`dispatch:driver:${bookingId}`).catch(() => {});
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Emit handler error:", error);
    res.status(500).json({ success: false });
  }
});

// Warn loudly on startup if SOCKET_INTERNAL_SECRET is not set
if (!process.env.SOCKET_INTERNAL_SECRET) {
  console.warn(
    "\n⚠️  [SECURITY WARNING] SOCKET_INTERNAL_SECRET is not set.\n" +
    "   The /emit and /emit-admin endpoints are OPEN to the internet.\n" +
    "   Set SOCKET_INTERNAL_SECRET in your environment to secure them.\n"
  );
}

// Start cron and telemetry services
if (process.env.NODE_ENV !== "test") {
  startCronServices(io);
}

if (process.env.NODE_ENV !== "test") {
  server.listen(port, () => {
    console.log("server started at", port);
  });
}

export { app, server, io, redisPub, redisSub };
