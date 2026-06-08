import express, { Request, Response, NextFunction } from "express";
import http from "http";
import dotenv from "dotenv";
import { Server, Socket } from "socket.io";
import axios from "axios";
import { Redis } from "ioredis";
import { createAdapter } from "@socket.io/redis-adapter";
import os from "os";
import AuditLog from "./models/auditLog.models.js";
import User from "./models/user.models.js";
import Booking from "./models/booking.models.js";
import mongoose from "mongoose";
import { sendPushNotification } from "./src/services/fcm.js";

dotenv.config();

const redisPub = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379");
const redisSub = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379");

// Dedicated Redis clients for Socket.IO horizontal scaling
// BUG-011 FIX: socketSub must duplicate redisSub, not redisPub
const socketPub = redisPub.duplicate();
const socketSub = redisSub.duplicate();

// Metrics trackers
let peakConnections = 0;
let connectionsThisMinute = 0;

setInterval(() => {
  connectionsThisMinute = 0;
}, 60000);

// Logging Helper
async function logSocketEvent(
  action: string,
  details: string,
  severity = "info",
  category = "task",
  actor = "system",
  targetId: string | null = null,
  targetModel: string | null = null
) {
  try {
    const logEntry = new AuditLog({
      action,
      details,
      severity,
      category,
      actor,
      targetId: targetId ? new mongoose.Types.ObjectId(targetId) : null,
      targetModel,
    });
    await logEntry.save();
    io.to("admin-dashboard").emit("live-audit-log", logEntry.toObject());
  } catch (err: any) {
    console.error("Failed to write socket log:", err.message);
  }
}

// Stats aggregation helpers
async function getRedisMetrics() {
  try {
    const rawInfo = await redisPub.info();
    const metrics: Record<string, string> = {};
    rawInfo.split("\r\n").forEach((line: string) => {
      const parts = line.split(":");
      if (parts.length === 2) {
        metrics[parts[0]] = parts[1];
      }
    });

    const hits = parseInt(metrics.keyspace_hits || "0", 10);
    const misses = parseInt(metrics.keyspace_misses || "0", 10);
    const total = hits + misses;
    const hitRate = total > 0 ? Math.round((hits / total) * 100) : 100;

    let keysCount = 0;
    if (metrics.db0) {
      const keysParts = metrics.db0.split(",");
      keysParts.forEach((part) => {
        const keyVal = part.split("=");
        if (keyVal[0] === "keys") {
          keysCount = parseInt(keyVal[1] || "0", 10);
        }
      });
    }

    return {
      memoryUsedBytes: parseInt(metrics.used_memory || "0", 10),
      memoryUsedHuman: metrics.used_memory_human || "0B",
      connectedClients: parseInt(metrics.connected_clients || "0", 10),
      keysCount,
      evictedKeys: parseInt(metrics.evicted_keys || "0", 10),
      hitRate,
    };
  } catch (err) {
    return {
      memoryUsedBytes: 10485760,
      memoryUsedHuman: "10.00M",
      connectedClients: 2,
      keysCount: 5,
      evictedKeys: 0,
      hitRate: 100,
    };
  }
}

async function getApiMetrics() {
  try {
    // PERF-001 FIX: cap at last 1000 entries to prevent unbounded reads
    const MAX_ENTRIES = 1000;
    const rawList = await redisPub.lrange("api:metrics:raw", -MAX_ENTRIES, -1);
    // Trim the list to keep only the most recent MAX_ENTRIES records
    await redisPub.ltrim("api:metrics:raw", -MAX_ENTRIES, -1).catch(() => {});

    if (!rawList || rawList.length === 0) {
      return { avgResponseTimeMs: 0, p95LatencyMs: 0, p99LatencyMs: 0, rps: 0, successRate: 100, errorRate: 0 };
    }

    let totalLatency = 0;
    let successCount = 0;
    const latencies: number[] = [];

    rawList.forEach((item: string) => {
      const parts = item.split(":");
      if (parts.length >= 2) {
        const latency = parseInt(parts[0] || "0", 10);
        const status = parseInt(parts[1] || "200", 10);
        latencies.push(latency);
        totalLatency += latency;
        if (status >= 200 && status < 400) {
          successCount++;
        }
      }
    });

    if (latencies.length === 0) {
      return { avgResponseTimeMs: 0, p95LatencyMs: 0, p99LatencyMs: 0, rps: 0, successRate: 100, errorRate: 0 };
    }

    latencies.sort((a, b) => a - b);
    const p95Idx = Math.floor(latencies.length * 0.95);
    const p99Idx = Math.floor(latencies.length * 0.99);

    const totalCount = latencies.length;
    const successRate = Math.round((successCount / totalCount) * 100);

    return {
      avgResponseTimeMs: Math.round(totalLatency / totalCount),
      p95LatencyMs: latencies[p95Idx] ?? latencies[latencies.length - 1],
      p99LatencyMs: latencies[p99Idx] ?? latencies[latencies.length - 1],
      rps: Math.round(totalCount / 10), // normalized RPS estimate
      successRate,
      errorRate: 100 - successRate,
    };
  } catch (err) {
    return { avgResponseTimeMs: 0, p95LatencyMs: 0, p99LatencyMs: 0, rps: 0, successRate: 100, errorRate: 0 };
  }
}

// Prevent unhandled rejection crashes during transient connection dropouts
redisPub.on("error", (err: Error) => console.error("Redis Pub Client Error:", err.message));
redisSub.on("error", (err: Error) => console.error("Redis Sub Client Error:", err.message));
socketPub.on("error", (err: Error) => console.error("Redis SocketPub Client Error:", err.message));
socketSub.on("error", (err: Error) => console.error("Redis SocketSub Client Error:", err.message));

const mongoUrl = process.env.MONGODB_URL;
if (!mongoUrl) {
  throw new Error("MONGODB_URL env is not set!");
}
await mongoose.connect(mongoUrl);

// Clean up stale online connections on startup
try {
  const resetResult = await User.updateMany(
    {},
    {
      isOnline: false,
      socketId: null,
      isPartnerAvailable: false,
    }
  );
  console.log("Database startup cleanup completed. Reset result:", resetResult);
} catch (error) {
  console.error("Database startup cleanup failed:", error);
}

// Clean up active driver locations GeoSet in Redis on startup
try {
  await redisPub.del("driver:locations:active");
  console.log("Redis active locations cleared on startup.");
} catch (error: any) {
  console.error("Failed to clear Redis active locations on startup:", error.message);
}

// Enable Redis keyspace event notifications for key expiration (Ex)
try {
  await redisPub.config("SET", "notify-keyspace-events", "Ex");
  console.log("Redis keyspace events notifications configured successfully.");
} catch (error: any) {
  console.error("Failed to configure Redis keyspace events:", error.message);
} 

// Listen to expired keyspace events for auto-offline
redisSub.subscribe("__keyevent@0__:expired", (err: Error | null | undefined) => {
  if (err) {
    console.error("Failed to subscribe to Redis expiration channel:", err.message);
  } else {
    console.log("Subscribed to Redis keyspace expiration notifications.");
  }
});

redisSub.on("message", async (channel: string, message: string) => {
  if (channel === "__keyevent@0__:expired") {
    // ── Presence heartbeat expiration → mark partner offline ──
    if (message.startsWith("presence:driver:")) {
      const driverId = message.split(":")[2];
      console.log(`Presence heartbeat expired for driver ${driverId}. Mark offline.`);
      try {
        const updateResult = await User.updateOne(
          { _id: driverId },
          {
            isOnline: false,
            socketId: null,
            isPartnerAvailable: false,
          }
        );
        console.log(`Driver ${driverId} marked offline. Result:`, updateResult);
        await redisPub.zrem("driver:locations:active", driverId);
        notifyAdminMapThrottled();
        notifyPublicAvailabilityThrottled("presence-expired");

        await logSocketEvent(
          "driver_presence_expired",
          `Presence heartbeat expired. Driver marked offline automatically.`,
          "warning",
          "task",
          "system",
          driverId,
          "User"
        );
      } catch (err) {
        console.error(`Error processing offline expiry for driver ${driverId}:`, err);
      }
    }

    // ── Dispatch timer expiration → cascade to next driver ──
    if (message.startsWith("dispatch:timer:")) {
      const bookingId = message.replace("dispatch:timer:", "");

      // BUG-005 FIX: Acquire cascade lock — competing with in-memory setTimeout path
      const cascadeLockKey = `cascade:lock:${bookingId}`;
      let lockAcquired = false;
      try {
        const result = await redisPub.set(cascadeLockKey, "1", "EX", 30, "NX");
        lockAcquired = result === "OK";
      } catch {
        lockAcquired = true; // Redis down — proceed to avoid silent failure
      }

      if (!lockAcquired) {
        console.log(`[RedisDispatch] Cascade already handled by in-memory timer for ${bookingId}. Skipping.`);
        return;
      }

      // Clear in-memory timer if it hasn't fired yet (Redis got here first)
      if (activeTimers.has(bookingId)) {
        clearTimeout(activeTimers.get(bookingId)!);
        activeTimers.delete(bookingId);
      }

      console.log(`[RedisDispatch] dispatch:timer:${bookingId} expired via Redis keyspace. Triggering cascade...`);
      try {
        const nextBaseUrl = process.env.NEXT_BASE_URL || "http://localhost:3000";
        const cascadeSecret = process.env.CASCADE_INTERNAL_SECRET;
        // Retrieve driverId from Redis before the key was deleted by expiration
        // (We store it in a companion key that lasts slightly longer)
        const driverIdRaw = await redisPub.get(`dispatch:driver:${bookingId}`);
        await axios.post(
          `${nextBaseUrl.replace(/\/+$/, "")}/api/booking/${bookingId}/cascade`,
          { driverId: driverIdRaw || undefined },
          {
            timeout: 10000,
            ...(cascadeSecret ? { headers: { "x-cascade-secret": cascadeSecret } } : {}),
          }
        );

        await logSocketEvent(
          "booking_cascade_timeout",
          `Matchmaker response timer expired. Initiating driver cascade.`,
          "info",
          "task",
          "system",
          bookingId,
          "Booking"
        );
      } catch (err: any) {
        console.warn(`[RedisDispatch] Cascade error for booking ${bookingId}:`, err.message);
      } finally {
        // Clean up companion key
        await redisPub.del(`dispatch:driver:${bookingId}`).catch(() => {});
      }
    }
  }
});

const app = express();
app.use(express.json());
const server = http.createServer(app);
const port = process.env.PORT || 8000;

const normalizeOrigin = (origin: string | undefined) => origin?.replace(/\/+$/, "");
const allowedOrigins = [
  process.env.NEXT_BASE_URL,
  process.env.CLIENT_URL,
  "https://rydexx.netlify.app",
  "http://localhost:3000",
]
  .filter(Boolean)
  .map(normalizeOrigin);

// Declare typed interfaces for Socket events
export interface ServerToClientEvents {
  blocked: (data: { message: string }) => void;
  "live-audit-log": (log: any) => void;
  "admin-dashboard-update": (data: { scope: string; reason: string; at: number }) => void;
  "driver-availability-updated": (data: { reason: string; at: number }) => void;
  "admin-driver-location": (data: { driverId: string; latitude: number; longitude: number; at: number }) => void;
  "driver-location": (data: { latitude: number; longitude: number; status: string }) => void;
  "chat-message": (msg: any) => void;
  "chat-typing": (data: { rideId: string; sender: "user" | "driver"; isTyping: boolean }) => void;
  "chat-read": (data: { rideId: string; sender: "user" | "driver" }) => void;
  "system-telemetry-update": (payload: any) => void;
  "new-booking": (data: any) => void;
  "booking-updated": (data: any) => void;
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
}

export interface InterServerEvents {}
export interface SocketData {
  userId?: string;
}

const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(server, {
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

app.get("/", (req: Request, res: Response) => {
  res.json({ success: true, service: "rydex-socket-server" });
});

app.get("/health", (req: Request, res: Response) => {
  res.json({ success: true, clientsCount: io.engine.clientsCount });
});

const activeTimers = new Map<string, NodeJS.Timeout>();
let adminMapNotifyTimer: NodeJS.Timeout | null = null;
let publicAvailabilityNotifyTimer: NodeJS.Timeout | null = null;

function notifyAdminMapThrottled() {
  if (adminMapNotifyTimer) return;
  adminMapNotifyTimer = setTimeout(() => {
    io.to("admin-dashboard").emit("admin-dashboard-update", {
      scope: "map",
      reason: "location",
      at: Date.now(),
    });
    adminMapNotifyTimer = null;
  }, 1000);
}

function notifyPublicAvailabilityThrottled(reason = "availability") {
  if (publicAvailabilityNotifyTimer) return;
  publicAvailabilityNotifyTimer = setTimeout(() => {
    io.emit("driver-availability-updated", {
      reason,
      at: Date.now(),
    });
    publicAvailabilityNotifyTimer = null;
  }, 1000);
}

// SEC-009: Warn loudly on startup if SOCKET_INTERNAL_SECRET is not set
if (!process.env.SOCKET_INTERNAL_SECRET) {
  console.warn(
    "\n⚠️  [SECURITY WARNING] SOCKET_INTERNAL_SECRET is not set.\n" +
    "   The /emit and /emit-admin endpoints are OPEN to the internet.\n" +
    "   Set SOCKET_INTERNAL_SECRET in your environment to secure them.\n"
  );
}

function requireSocketSecret(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.SOCKET_INTERNAL_SECRET;
  if (!secret) {
    console.error("[socket] SOCKET_INTERNAL_SECRET is not configured in the environment! Access denied.");
    res.status(500).json({ success: false, message: "Server misconfigured" });
    return;
  }

  if (req.get("x-socket-secret") !== secret) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }

  next();
}

/** Broadcast to all admins in the control-tower room */
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

function emitToBookingRoom(bookingId: string, event: string, data: any) {
  if (!bookingId) return;
  const room = `booking-${String(bookingId)}`;
  io.to(room).emit(event as any, data);
}

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
          let title = "Rydex Update";
          let body = "You have a new update.";
          
          if (event === "new-booking") {
            title = "New Ride Request!";
            body = "Tap to view pickup details.";
          } else if (event === "booking-updated") {
            title = "Ride Status Updated";
            body = data?.status ? `Booking is now ${data.status}` : "Your ride status was updated.";
          } else if (event === "new-notification") {
            title = data?.title || "New Message from Rydex";
            body = data?.message || "You have a new notification.";
          }

          await sendPushNotification(targetUser.fcmTokens as string[], title, body, {
            bookingId: String(bookingRoomId || ""),
            event,
          });
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

      // ── Primary: Redis key expiration (crash-resilient across server restarts) ──
      // Store driverId in a companion key with 45s TTL (slight buffer after the 40s timer)
      let redisTimerSet = false;
      try {
        await redisPub.set(`dispatch:timer:${bookingId}`, "1", "EX", 40);
        await redisPub.set(`dispatch:driver:${bookingId}`, driverId, "EX", 45);
        redisTimerSet = true;
        console.log(`[RedisDispatch] Set dispatch:timer:${bookingId} (40s TTL)`);
      } catch (err: any) {
        console.warn(`[RedisDispatch] Redis timer unavailable, using in-memory fallback:`, err.message);
      }

      // ── Fallback: in-memory setTimeout (works when Redis keyspace events unavailable) ──
      const timer = setTimeout(async () => {
        try {
          // BUG-005 FIX: Use a Redis SETNX cascade-lock to prevent double-cascade.
          // Both the Redis expiry path and this in-memory path compete for this lock.
          // Only one will acquire it (NX = set only if Not eXists).
          const cascadeLockKey = `cascade:lock:${bookingId}`;
          let lockAcquired = false;
          try {
            const result = await redisPub.set(cascadeLockKey, "1", "EX", 30, "NX");
            lockAcquired = result === "OK";
          } catch {
            // Redis unavailable — assume lock acquired to avoid silent failure
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
        // Also clean up Redis dispatch keys
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

// Start telemetry ticker
if (process.env.NODE_ENV !== "test") {
  setInterval(async () => {
    try {
      const redisMetrics = await getRedisMetrics();
      const apiMetrics = await getApiMetrics();

      const payload = {
        ws: {
          connectedClients: io.engine.clientsCount,
          connectionRate: connectionsThisMinute,
          peakConnections: peakConnections,
          status: "Healthy",
        },
        redis: redisMetrics,
        api: apiMetrics,
        server: {
          cpuLoad: os.loadavg()[0],
          memoryUsagePercentage: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100),
          memoryTotalGb: Math.round(os.totalmem() / 1024 / 1024 / 1024),
          memoryFreeGb: Math.round(os.freemem() / 1024 / 1024 / 1024),
          processHeapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          processHeapTotalMb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          jobQueueSize: activeTimers.size,
        },
        timestamp: Date.now(),
      };

      io.to("admin-dashboard").emit("system-telemetry-update", payload);
    } catch (err: any) {
      console.error("[Telemetry] Failed to gather and broadcast telemetry:", err.message);
    }
  }, 2000);

  // ── Stale payment expiry cron (every 60 seconds) ─────────────────────────
  // Expires bookings stuck in `awaiting_payment` past their payment deadline.
  setInterval(async () => {
    try {
      const nextBaseUrl = process.env.NEXT_BASE_URL || "http://localhost:3000";
      const cascadeSecret = process.env.CASCADE_INTERNAL_SECRET;
      await axios.post(
        `${nextBaseUrl.replace(/\/+$/, "")}/api/booking/expire-stale`,
        {},
        {
          timeout: 10000,
          ...(cascadeSecret ? { headers: { "x-cascade-secret": cascadeSecret } } : {}),
        }
      );
    } catch (err: any) {
      // Non-fatal — log only real errors, not 404s (no stale bookings)
      if (err?.response?.status !== 200 && err?.response?.status !== 404) {
        console.warn("[ExpireStale] Cron call failed:", err.message);
      }
    }
  }, 60000);

  // ── Scheduled rides dispatch cron (every 60 seconds) ─────────────────────
  // Dispatches bookings whose scheduledAt is within the next 10 minutes.
  setInterval(async () => {
    try {
      const nextBaseUrl = process.env.NEXT_BASE_URL || "http://localhost:3000";
      const cascadeSecret = process.env.CASCADE_INTERNAL_SECRET;
      await axios.post(
        `${nextBaseUrl.replace(/\/+$/, "")}/api/booking/dispatch-scheduled`,
        {},
        {
          timeout: 15000,
          ...(cascadeSecret ? { headers: { "x-cascade-secret": cascadeSecret } } : {}),
        }
      );
    } catch (err: any) {
      if (err?.response?.status !== 200 && err?.response?.status !== 404) {
        console.warn("[DispatchScheduled] Cron call failed:", err.message);
      }
    }
  }, 60000);
}


// Extend socket type definition for type-safety inside io handlers
interface SocketWithUser extends Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> {
  userId?: string;
}

io.on("connection", (socket: SocketWithUser) => {
  connectionsThisMinute++;
  const connectedClients = io.engine.clientsCount;
  if (connectedClients > peakConnections) {
    peakConnections = connectedClients;
  }

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

if (process.env.NODE_ENV !== "test") {
  server.listen(port, () => {
    console.log("server started at", port);
  });
}

export { app, server, io, redisPub, redisSub };
