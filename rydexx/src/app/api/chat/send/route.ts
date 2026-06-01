import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import ChatMessage from "@/models/chatMessage.model";
import { getRedisClient } from "@/lib/redis";

const CHAT_TTL_SECONDS = 86400; // 24 hours

export async function POST(req: Request) {
  await connectDb();

  const { rideId, text, sender } = await req.json();

  const msg = await ChatMessage.create({ rideId, text, sender });

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