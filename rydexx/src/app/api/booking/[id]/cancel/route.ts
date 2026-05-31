import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import { emitBookingUpdated } from "@/lib/bookingEvents";
import { getRedisClient } from "@/lib/redis";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  await connectDb();
  const booking =await Booking.findOneAndUpdate(
  { _id: id, status: "requested" },
  { status: "cancelled" }
);

  if (!booking)
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  booking.status = "cancelled";

  // Release Redis driver lock if there was a driver assigned
  if (booking.driver) {
    const redis = getRedisClient();
    await redis.del(`lock:driver:${String(booking.driver)}`);
  }

  await booking.save();

  await emitBookingUpdated(booking, {
    bookingId: booking._id,
    status: "cancelled",
  });

  return NextResponse.json({ success: true });
}
