import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import { emitBookingUpdated } from "@/lib/bookingEvents";
import { getRedisClient } from "@/lib/redis";
import { auth } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  await connectDb();

  // ── Auth guard ───────────────────────────────────────────────
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Atomically cancel — only if the booking belongs to this user AND is still "requested"
  const booking = await Booking.findOneAndUpdate(
    { _id: id, user: session.user.id, status: "requested" },
    { status: "cancelled" },
    { new: true }
  );

  if (!booking) {
    return NextResponse.json(
      { message: "Booking not found or cannot be cancelled" },
      { status: 404 }
    );
  }

  // Release Redis driver lock if there was a driver assigned
  if (booking.driver) {
    try {
      const redis = getRedisClient();
      await redis.del(`lock:driver:${String(booking.driver)}`);
    } catch (err) {
      console.warn("Failed to delete redis lock on cancel:", err);
    }
  }

  // No second save — findOneAndUpdate already persisted the status change atomically

  await emitBookingUpdated(booking, {
    bookingId: booking._id,
    status: "cancelled",
  });

  return NextResponse.json({ success: true });
}

