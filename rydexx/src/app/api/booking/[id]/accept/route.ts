import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import { emitBookingUpdated } from "@/lib/bookingEvents";
import { auth } from "@/lib/auth";
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

  const booking = await Booking.findById(id).populate("driver vehicle");

  if (!booking || booking.status !== "requested") {
    return NextResponse.json({ message: "Invalid" }, { status: 400 });
  }

  if (String(booking.driver) !== String(session.user.id)) {
    return NextResponse.json(
      { message: "Not assigned to this ride" },
      { status: 403 },
    );
  }

  booking.status = "awaiting_payment";
  booking.paymentDeadline = new Date(Date.now() + 5 * 60 * 1000);

  await booking.save();

  await emitBookingUpdated(booking, {
    bookingId: booking._id,
    status: "awaiting_payment",
  });

  return NextResponse.json({ success: true });
}
