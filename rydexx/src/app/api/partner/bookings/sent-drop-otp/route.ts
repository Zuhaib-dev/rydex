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

    booking.dropOtp = otp;
    booking.dropOtpExpires = new Date(Date.now() + 5 * 60 * 1000);

    await booking.save();

    /* Send Mail */

    // Email sending removed as per user request (OTP relies on real-time toast notifications)

    await emitBookingUpdated(booking, {
      bookingId: booking._id,
      dropOtp: otp,
      status: booking.status,
    });

    return NextResponse.json({
      success: true,
      message: "drop OTP sent",
    });

  } catch (error) {

    console.error(error);

    return NextResponse.json(
      { message: "OTP send failed" },
      { status: 500 }
    );

  }

}