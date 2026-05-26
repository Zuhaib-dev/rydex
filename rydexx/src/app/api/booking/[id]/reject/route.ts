import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import { auth } from "@/lib/auth";
import { emitBookingUpdated } from "@/lib/bookingEvents";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  await connectDb();
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const driverId = session.user.id;

  const booking = await Booking.findOneAndUpdate(
    {
      _id: id,
      driver: driverId,
      status: "requested",
    },
    {
      status: "rejected",
    },
    { new: true }
  );

  if (!booking) {
    return NextResponse.json(
      { message: "Ride already processed or invalid" },
      { status: 400 }
    );
  }

  await emitBookingUpdated(booking, {
    bookingId: booking._id,
    status: "rejected",
  });

  return NextResponse.json({ success: true });
}
