import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { emitBookingUpdated } from "@/lib/bookingEvents";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDb();
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const id = (await context.params).id;
    const booking = await Booking.findById(id);

    if (!booking) {
      return NextResponse.json({ message: "Booking not found" }, { status: 404 });
    }

    // Verify participant is triggering the SOS (user/passenger or driver/partner)
    const isUser = booking.user.toString() === session.user.id;
    const isDriver = booking.driver.toString() === session.user.id;

    if (!isUser && !isDriver) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    booking.sosTriggered = true;
    booking.sosTriggeredAt = new Date();
    await booking.save();

    // Propagate the real-time event to passenger and driver
    await emitBookingUpdated(booking, {
      bookingId: booking._id,
      status: booking.status,
      sosTriggered: true,
      sosTriggeredAt: booking.sosTriggeredAt,
    });

    return NextResponse.json({ success: true, booking });
  } catch (error: any) {
    console.error("POST /api/booking/[id]/sos error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
