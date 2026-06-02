import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import { emitBookingUpdated } from "@/lib/bookingEvents";
import { getBookingDriverId } from "@/lib/bookingDriver";
import { auth } from "@/lib/auth";
import { getRedisClient } from "@/lib/redis";
import { NextResponse, NextRequest } from "next/server";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  await connectDb();

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const booking = await Booking.findById(id);

  if (!booking || booking.status !== "requested") {
    return NextResponse.json({ message: "Invalid" }, { status: 400 });
  }

  const assignedDriverId = getBookingDriverId(booking.driver);

  if (assignedDriverId !== String(session.user.id)) {
    return NextResponse.json(
      { message: "Not assigned to this ride" },
      { status: 403 },
    );
  }

  booking.status = "awaiting_payment";
  booking.paymentDeadline = new Date(Date.now() + 5 * 60 * 1000);

  await booking.save();

  try {
    const redis = getRedisClient();
    await redis.del(`lock:driver:${assignedDriverId}`);
  } catch (err) {
    console.warn("Failed to delete redis lock on accept:", err);
  }

  const populated = await Booking.findById(id).populate("driver vehicle");

  await emitBookingUpdated(populated ?? booking, {
    bookingId: booking._id,
    status: "awaiting_payment",
  });

  return NextResponse.json({ success: true });
}
