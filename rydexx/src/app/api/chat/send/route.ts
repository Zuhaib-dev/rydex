import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import { auth } from "@/lib/auth";
import Booking from "@/models/booking.model";
import ChatMessage from "@/models/chatMessage.model";
import { getRedisClient } from "@/lib/redis";

const CHAT_TTL_SECONDS = 86400; // 24 hours

export async function POST(req: Request) {
  await connectDb();

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { rideId, text } = await req.json();
  const normalizedText = typeof text === "string" ? text.trim() : "";
  if (!rideId || !normalizedText) {
    return NextResponse.json(
      { message: "rideId and text are required" },
      { status: 400 },
    );
  }

  const booking = await Booking.findById(rideId).select("user driver").lean();
  if (!booking) {
    return NextResponse.json({ message: "Booking not found" }, { status: 404 });
  }

  const isUser = String(booking.user) === String(session.user.id);
  const isDriver = String(booking.driver) === String(session.user.id);
  if (!isUser && !isDriver) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const sender = isDriver ? "driver" : "user";
  const msg = await ChatMessage.create({
    rideId,
    text: normalizedText,
    sender,
  });

  // Write-through cache: push message to Redis List for instant history retrieval
  try {
    const redis = getRedisClient();
    const cacheKey = `chat:booking:${rideId}`;
    await redis.rpush(cacheKey, JSON.stringify({
      _id: String(msg._id),
      rideId,
      text: msg.text,
      sender: msg.sender,
      createdAt: msg.createdAt,
    }));
    // Refresh TTL on every new message — 24h from last activity
    await redis.expire(cacheKey, CHAT_TTL_SECONDS);
  } catch (err) {
    // Redis failure is non-fatal — message is already persisted in MongoDB
    console.warn("[chat/send] Redis cache write failed (non-critical):", err);
  }

  return NextResponse.json({ success: true, message: msg });
}
