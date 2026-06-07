import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import { auth } from "@/lib/auth";
import Booking from "@/models/booking.model";
import ChatMessage from "@/models/chatMessage.model";
import { getRedisClient } from "@/lib/redis";

export async function POST(req: Request) {
  await connectDb();

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { rideId } = await req.json();
  if (!rideId) {
    return NextResponse.json({ message: "rideId is required" }, { status: 400 });
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

  const currentRole = isDriver ? "driver" : "user";
  const targetSender = currentRole === "driver" ? "user" : "driver";

  // Mark all unread messages sent by the opposite party as read
  await ChatMessage.updateMany(
    { rideId, sender: targetSender, status: { $ne: "read" } },
    { $set: { status: "read" } }
  );

  // Invalidate Redis cache to trigger database fallback and backfill on next get-all call
  try {
    const redis = getRedisClient();
    const cacheKey = `chat:booking:${rideId}`;
    await redis.del(cacheKey);
  } catch (err) {
    console.warn("[chat/read] Redis cache invalidation failed (non-critical):", err);
  }

  return NextResponse.json({ success: true });
}
