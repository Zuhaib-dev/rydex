import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import { emitBookingUpdated } from "@/lib/bookingEvents";
import { auth } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  await connectDb();

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const booking = await Booking.findById(id);
  if (!booking)
    return NextResponse.json({ message: "Not found" }, { status: 404 });

  if (String(booking.driver) !== String(session.user.id)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  if (booking.status !== "arriving") {
    return NextResponse.json(
      { message: "Booking must be arriving before marking arrived" },
      { status: 409 },
    );
  }

  booking.status = "arrived";
  booking.arrivedAt = new Date();

  await booking.save();

  await emitBookingUpdated(booking, {
    bookingId: booking._id,
    status: "arrived",
  });

  return NextResponse.json({ success: true });
}
