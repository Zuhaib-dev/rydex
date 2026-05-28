import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Booking from "@/models/booking.model";
import { sendMail } from "@/lib/sendMail";
import { getOtpEmailTemplate } from "@/lib/emailTemplate";
import { emitBookingUpdated } from "@/lib/bookingEvents";


export async function POST(req: Request) {

  await connectDB();

  try {

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

    /* Generate OTP */
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    booking.pickupOtp = otp;
    booking.pickupOtpExpires = new Date(Date.now() + 5 * 60 * 1000);
    if (booking.status !== "arrived") {
      booking.status = "arrived";
    }

    await booking.save();

    if (booking.user?.email) {
      await sendMail(
        booking.user.email,
        "Your Pickup OTP - RYDEX",
        getOtpEmailTemplate(
          otp,
          "Your driver has arrived! Share this OTP with your driver to start the ride.",
          "Pickup OTP",
        ),
      );
    }

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