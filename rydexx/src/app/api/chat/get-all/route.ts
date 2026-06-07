import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import { auth } from "@/lib/auth";
import Booking from "@/models/booking.model";
import ChatMessage from "@/models/chatMessage.model";
import { getRedisClient } from "@/lib/redis";

const CHAT_TTL_SECONDS = 86400; // 24 hours

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { rideId } = await req.json();
  if (!rideId) {
    return NextResponse.json({ message: "rideId is required" }, { status: 400 });
  }

  await connectDb();
  const booking = await Booking.findById(rideId).select("user driver").lean();
  if (!booking) {
    return NextResponse.json({ message: "Booking not found" }, { status: 404 });
  }

  const isParticipant =
    String(booking.user) === String(session.user.id) ||
    String(booking.driver) === String(session.user.id);
  if (!isParticipant) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  // 1. Try Redis first — sub-millisecond history retrieval
  try {
    const redis = getRedisClient();
    const cacheKey = `chat:booking:${rideId}`;
    const cached = await redis.lrange(cacheKey, 0, -1);

    if (cached && cached.length > 0) {
      const messages = cached.map((item) => JSON.parse(item));
      return NextResponse.json({ messages, source: "cache" });
    }
  } catch (err) {
    console.warn("[chat/get-all] Redis read failed, falling back to MongoDB:", err);
  }

  // 2. MongoDB fallback — also backfills Redis for next request
  const messages = await ChatMessage.find({ rideId }).sort({ createdAt: 1 }).lean();

  // Backfill Redis so subsequent opens are instant
  if (messages.length > 0) {
    try {
      const redis = getRedisClient();
      const cacheKey = `chat:booking:${rideId}`;
      const pipeline = redis.multi();
      pipeline.del(cacheKey);
      for (const msg of messages) {
        pipeline.rpush(cacheKey, JSON.stringify({
          _id: String(msg._id),
          rideId: String(msg.rideId),
          text: msg.text,
          sender: msg.sender,
          status: msg.status || "sent",
          createdAt: msg.createdAt,
        }));
      }
      pipeline.expire(cacheKey, CHAT_TTL_SECONDS);
      await pipeline.exec();
    } catch (err) {
      console.warn("[chat/get-all] Redis backfill failed (non-critical):", err);
    }
  }

  return NextResponse.json({ messages, source: "db" });
}
