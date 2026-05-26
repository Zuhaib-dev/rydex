import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import { emitBookingUpdated } from "@/lib/bookingEvents";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  await connectDb();

  const booking = await Booking.findById(id);
  if (!booking)
    return NextResponse.json({ message: "Not found" }, { status: 404 });

booking.status = "arrived";
booking.arrivedAt = new Date();

  await booking.save();

  await emitBookingUpdated(booking, {
    bookingId: booking._id,
    status: "arrived",
  });

  return NextResponse.json({ success: true });
}
