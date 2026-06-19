import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Booking from "@/models/booking.model";
import { emitBookingUpdated } from "@/lib/bookingEvents";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  await connectDB();
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { bookingId } = await req.json();
    const booking = await Booking.findById(bookingId).populate("driver vehicle");

    if (!booking) return NextResponse.json({ message: "Booking not found" }, { status: 404 });
    if (String(booking.driver._id ?? booking.driver) !== String(session.user.id)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    if (booking.paymentStatus !== "pass") return NextResponse.json({ message: "Invalid payment method for this operation" }, { status: 400 });

    booking.status = "completed";
    await booking.save();

    await emitBookingUpdated(booking, {
      bookingId: booking._id,
      status: "completed",
    });

    return NextResponse.json({ success: true, message: "Ride completed via Pass validation." });
  } catch (error) {
    console.error("Pass completion error:", error);
    return NextResponse.json({ message: "Failed to complete ride" }, { status: 500 });
  }
}
