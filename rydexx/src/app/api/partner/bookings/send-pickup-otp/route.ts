import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Booking from "@/models/booking.model";
import { emitBookingUpdated } from "@/lib/bookingEvents";
import { auth } from "@/lib/auth";


export async function POST(req: Request) {

  await connectDB();

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { bookingId } = await req.json();

    const booking = await Booking
      .findById(bookingId)
      .populate("user");

    if (!booking) {
      return NextResponse.json(
        { message: "Booking not found" },
        { status: 404 }
      );
    }

    if (String(booking.driver) !== String(session.user.id)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    if (!["confirmed", "arriving", "arrived"].includes(booking.status)) {
      return NextResponse.json(
        { message: "Driver must be confirmed or arriving before sending pickup OTP" },
        { status: 409 },
      );
    }

    /* Generate OTP */
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    booking.pickupOtp = otp;
    booking.pickupOtpExpires = new Date(Date.now() + 5 * 60 * 1000);
    if (booking.status !== "arrived") {
      booking.status = "arrived";
    }

    await booking.save();

    // Email sending removed as per user request (OTP relies on real-time toast notifications)

    await emitBookingUpdated(booking, {
      bookingId: booking._id,
      status: booking.status,
      pickupOtp: otp,
    });

    return NextResponse.json({
      success: true,
      message: "Pickup OTP sent",
    });

  } catch (error) {

    console.error(error);

    return NextResponse.json(
      { message: "OTP send failed" },
      { status: 500 }
    );

  }

}
