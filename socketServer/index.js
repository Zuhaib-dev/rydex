import express from "express";
import http from "http";
import dotenv from "dotenv";
import { Server } from "socket.io";
import axios from "axios";

dotenv.config();

import mongoose from "mongoose";
import User from "./models/user.models.js";

await mongoose.connect(process.env.MONGODB_URL);
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

app.get("/", (req, res) => {
  res.json({ success: true, service: "rydex-socket-server" });
});

app.get("/health", (req, res) => {
  res.json({ success: true });
});

const activeTimers = new Map();

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

app.post("/emit", async (req, res) => {
  const { userId, event, data } = req.body;

  try {
    const user = await User.findById(userId);

    if (user?.socketId) {
      io.to(user.socketId).emit(event, data);
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
          await axios.post(`${nextBaseUrl.replace(/\/+$/, "")}/api/booking/${bookingId}/cascade`, { driverId });
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
      { new: true },
    );

    if (user?.role === "admin") {
      socket.join("admin-dashboard");
    }
  });

  socket.on("join-admin", async () => {
    if (!socket.userId) return;

    const user = await User.findById(socket.userId).select("role");
    if (user?.role === "admin") {
      socket.join("admin-dashboard");
    }
  });

  // server.js — sab jagah ek hi format rakho

  socket.on("join-booking", (bookingId) => {
    console.log("joining room:", `booking-${bookingId}`);
    socket.join(`booking-${bookingId}`); // ← prefix add karo
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

    await User.findByIdAndUpdate(socket.userId, {
      location: {
        type: "Point",
        coordinates: [longitude, latitude],
      },
    });
  });

  socket.on("disconnect", async () => {
    if (!socket.userId) return;

    await User.findByIdAndUpdate(socket.userId, {
      isOnline: false,
      socketId: null,
    });
  });
});

server.listen(port, () => {
  console.log("server started at", port);
});
