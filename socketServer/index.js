import express from "express";
import http from "http";
import dotenv from "dotenv";
import { Server } from "socket.io";
import axios from "axios";
import Redis from "ioredis";
import { createAdapter } from "@socket.io/redis-adapter";

dotenv.config();

const redisPub = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379");
const redisSub = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379");

// Dedicated Redis clients for Socket.IO horizontal scaling
const socketPub = redisPub.duplicate();
const socketSub = redisPub.duplicate(); 

// Prevent unhandled rejection crashes during transient connection dropouts
redisPub.on("error", (err) => console.error("Redis Pub Client Error:", err.message));
redisSub.on("error", (err) => console.error("Redis Sub Client Error:", err.message));
socketPub.on("error", (err) => console.error("Redis SocketPub Client Error:", err.message));
socketSub.on("error", (err) => console.error("Redis SocketSub Client Error:", err.message));

import mongoose from "mongoose";
import User from "./models/user.models.js";

await mongoose.connect(process.env.MONGODB_URL);

// Clean up stale online connections on startup
try {
  const resetResult = await User.updateMany({}, {
    isOnline: false,
    socketId: null,
    isPartnerAvailable: false,
  });
  console.log("Database startup cleanup completed. Reset result:", resetResult);
} catch (error) {
  console.error("Database startup cleanup failed:", error);
}

// Clean up active driver locations GeoSet in Redis on startup
try {
  await redisPub.del("driver:locations:active");
  console.log("Redis active locations cleared on startup.");
} catch (error) {
  console.error("Failed to clear Redis active locations on startup:", error.message);
}

// Enable Redis keyspace event notifications for key expiration (Ex)
try {
  await redisPub.config("SET", "notify-keyspace-events", "Ex");
  console.log("Redis keyspace events notifications configured successfully.");
} catch (error) {
  console.error("Failed to configure Redis keyspace events:", error.message);
}

// Listen to expired keyspace events for auto-offline
redisSub.subscribe("__keyevent@0__:expired", (err) => {
  if (err) {
    console.error("Failed to subscribe to Redis expiration channel:", err.message);
  } else {
    console.log("Subscribed to Redis keyspace expiration notifications.");
  }
});

redisSub.on("message", async (channel, message) => {
  if (channel === "__keyevent@0__:expired") {
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
        // Remove from active driver locations GeoSet
        await redisPub.zrem("driver:locations:active", driverId);
        notifyAdminMapThrottled();
      } catch (err) {
        console.error(`Error processing offline expiry for driver ${driverId}:`, err);
      }
    }
  }
});

const app = express();
app.use(express.json());
const server = http.createServer(app);
const port = process.env.PORT || 8000;

const normalizeOrigin = (origin) => origin?.replace(/\/+$/, "");
const allowedOrigins = [
  process.env.NEXT_BASE_URL,
  process.env.CLIENT_URL,
  "https://rydexx.netlify.app",
  "http://localhost:3000",
]
  .filter(Boolean)
  .map(normalizeOrigin);

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

app.get("/", (req, res) => {
  res.json({ success: true, service: "rydex-socket-server" });
});

app.get("/health", (req, res) => {
  res.json({ success: true, clientsCount: io.engine.clientsCount });
});

const activeTimers = new Map();
let adminMapNotifyTimer = null;

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

/** Broadcast to all admins in the control-tower room */
app.post("/emit-admin", (req, res) => {
  const { event = "admin-dashboard-update", data } = req.body ?? {};

  try {
    io.to("admin-dashboard").emit(event, data);
    res.json({ success: true });
  } catch (error) {
    console.error("Emit-admin handler error:", error);
    res.status(500).json({ success: false });
  }
});

function emitToBookingRoom(bookingId, event, data) {
  if (!bookingId) return;
  const room = `booking-${String(bookingId)}`;
  io.to(room).emit(event, data);
}

app.post("/emit", async (req, res) => {
  const { userId, event, data, bookingId: roomFromBody } = req.body;
  const bookingRoomId = roomFromBody || data?.bookingId;

  try {
    const user = await User.findById(userId).select("socketId").lean();

    if (user?.socketId) {
      io.to(user.socketId).emit(event, data);
    }

    if (bookingRoomId) {
      emitToBookingRoom(bookingRoomId, event, data);
    }

    // Matchmaker queue countdown hook
    if (event === "new-booking" && data?._id && data?.driver) {
      const bookingId = String(data._id);
      const driverId = String(data.driver);

      if (activeTimers.has(bookingId)) {
        clearTimeout(activeTimers.get(bookingId));
      }

      console.log(`Starting 20s matchmaker countdown for booking ${bookingId}, targeting driver ${driverId}`);

      const timer = setTimeout(async () => {
        try {
          console.log(`Booking ${bookingId} dispatch timed out for driver ${driverId}. Triggering cascade...`);
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
        } catch (err) {
          console.warn(`Error running cascade for booking ${bookingId}:`, err.message);
        } finally {
          activeTimers.delete(bookingId);
        }
      }, 20000);

      activeTimers.set(bookingId, timer);
    } else if (event === "booking-updated" && data?.bookingId && data?.status) {
      const bookingId = String(data.bookingId);
      const status = String(data.status);

      if (status !== "requested" && activeTimers.has(bookingId)) {
        console.log(`Clearing matchmaking timer for booking ${bookingId} (status updated to ${status})`);
        clearTimeout(activeTimers.get(bookingId));
        activeTimers.delete(bookingId);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Emit handler error:", error);
    res.status(500).json({ success: false });
  }
});

io.on("connection", (socket) => {
  socket.on("identity", async (userId) => {
    socket.userId = userId;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        socketId: socket.id,
        isOnline: true,
      },
      { returnDocument: "after", select: "role" },
    ).lean();

    if (user?.role === "admin") {
      socket.join("admin-dashboard");
    }

    if (user?.role === "partner") {
      // Set driver presence in Redis (10s TTL)
      await redisPub.set(`presence:driver:${userId}`, "online", "EX", 10);

      await User.updateOne({ _id: userId }, {
        isPartnerAvailable: true,
      });
    }
  });

  socket.on("join-admin", async () => {
    if (!socket.userId) return;

    const user = await User.findById(socket.userId).select("role").lean();
    if (user?.role === "admin") {
      socket.join("admin-dashboard");
    }
  });

  // server.js — sab jagah ek hi format rakho

  socket.on("join-booking", (bookingId) => {
    if (!bookingId) return;
    console.log("joining room:", `booking-${bookingId}`);
    socket.join(`booking-${bookingId}`);
  });

  socket.on("leave-booking", (bookingId) => {
    if (!bookingId) return;
    socket.leave(`booking-${bookingId}`);
  });

  socket.on("driver-location-update", (data) => {
    io.to(`booking-${data.bookingId}`) // ✅ already sahi
      .emit("driver-location", {
        latitude: data.latitude,
        longitude: data.longitude,
        status: "arriving",
      });
  });

  socket.on("chat-message", (msg) => {
    console.log("chat to room:", `booking-${msg.rideId}`);
    io.to(`booking-${msg.rideId}`).emit("chat-message", msg); // ← prefix add karo
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
      const count = results[1][1];
      if (count >= 10) {
        console.warn(`[RateLimiter] Driver ${socket.userId} throttled on update-location.`);
        return; // Ignore update
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
      { returnDocument: "after", select: "role" },
    ).lean();

    if (user?.role === "partner") {
      // Refresh Redis presence heartbeat
      await redisPub.set(`presence:driver:${socket.userId}`, "online", "EX", 10);

      // Store coordinate in Redis active driver locations GeoSet
      await redisPub.geoadd("driver:locations:active", longitude, latitude, socket.userId);

      io.to("admin-dashboard").emit("admin-driver-location", {
        driverId: String(user._id),
        latitude,
        longitude,
        at: now.getTime(),
      });
      notifyAdminMapThrottled();
    }
  });

  socket.on("partner-availability", async ({ available }) => {
    if (!socket.userId) return;

    const isAvailable = Boolean(available);

    if (isAvailable) {
      await redisPub.set(`presence:driver:${socket.userId}`, "online", "EX", 10);
    } else {
      await redisPub.del(`presence:driver:${socket.userId}`);
      await redisPub.zrem("driver:locations:active", socket.userId);
    }

    await User.updateOne({ _id: socket.userId }, {
      isPartnerAvailable: isAvailable,
      isOnline: isAvailable,
    });
  });

  socket.on("disconnect", async () => {
    if (!socket.userId) return;

    const user = await User.findById(socket.userId).select("role").lean();
    const update = {
      socketId: null,
      isPartnerAvailable: false,
    };

    if (user?.role === "partner") {
      update.isOnline = false;
      // Remove presence key on clean disconnect
      await redisPub.del(`presence:driver:${socket.userId}`);
      await redisPub.zrem("driver:locations:active", socket.userId);
    }

    await User.updateOne({ _id: socket.userId }, update);

    if (user?.role === "partner") {
      notifyAdminMapThrottled();
    }
  });
});

server.listen(port, () => {
  console.log("server started at", port);
});
