import connectDb from "@/lib/db";
import { sendMail } from "@/lib/sendMail";
import User from "@/models/user.model";
import bcrypt from "bcryptjs";
import { getOtpEmailTemplate } from "@/lib/emailTemplate";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: "Invalid email format" },
        { status: 400 }
      );
    }

    await connectDb();
    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    if (user.isEmailVerified) {
      return NextResponse.json(
        { message: "Email is already verified. Please log in." },
        { status: 400 }
      );
    }

    // Rate Limiting Check (Database-level): Only 1 OTP request allowed per 60 seconds
    if (user.otpExpiryAt) {
      const otpGeneratedAt = new Date(user.otpExpiryAt.getTime() - 10 * 60 * 1000);
      const timePassedMs = Date.now() - otpGeneratedAt.getTime();
      if (timePassedMs < 60 * 1000) {
        const secondsRemaining = Math.ceil((60 * 1000 - timePassedMs) / 1000);
        return NextResponse.json(
          { message: `Please wait ${secondsRemaining} seconds before requesting another OTP.` },
          { status: 429 }
        );
      }
    }

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiryAt = new Date(Date.now() + 10 * 60 * 1000);
    const hashedOtp = await bcrypt.hash(otp, 10);

    // Save hashed OTP & Reset attempts
    user.otp = hashedOtp;
    user.otpExpiryAt = otpExpiryAt;
    user.otpAttempts = 0;
    await user.save();

    // Send the email with the plain text OTP
    await sendMail(
      email,
      "Verify Your Email - Rydex",
      getOtpEmailTemplate(
        otp,
        "Here is your new OTP. Please use it to verify your email address and complete registration.",
        "New Verification OTP"
      )
    );

    return NextResponse.json(
      { message: "OTP resent successfully" },
      { status: 200 }
    );

  } catch (error: any) {
    console.error("Resend OTP error:", error);
    return NextResponse.json(
      { message: "An error occurred while resending OTP. Please try again." },
      { status: 500 }
    );
  }
}
