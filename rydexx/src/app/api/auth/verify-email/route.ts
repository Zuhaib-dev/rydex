import connectDb from "@/lib/db";
import User from "@/models/user.model";
import bcrypt from "bcryptjs";
import { logSystemEvent } from "@/lib/auditLogger";
import { rateLimit } from "@/lib/rateLimit";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  let requestEmail = "unknown";
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown-ip";
    const { success } = await rateLimit(`verify-email:${ip}`, 10, 15 * 60); // 10 attempts per 15 minutes
    
    if (!success) {
      return NextResponse.json({ message: "Too many verification attempts. Please try again later." }, { status: 429 });
    }

    await connectDb();
    const { email, otp } = await req.json();
    requestEmail = email || "unknown";
    console.log("[verify-email] received:", { email, otp: otp ? "[EXISTS]" : "[MISSING]" });

    if (!email || !otp) {
      return NextResponse.json(
        { message: "Please provide email and otp" },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    // 1. Check if OTP exists
    if (!user.otp) {
      await logSystemEvent({
        action: "email_verification_failed",
        details: "Verification attempt failed: OTP not found or already verified.",
        severity: "warning",
        category: "auth",
        actor: email,
        targetId: user._id,
        targetModel: "User",
        targetName: user.name,
      });
      return NextResponse.json(
        { message: "OTP not found or already verified. Please request a new one." },
        { status: 400 }
      );
    }

    // 2. Check if locked due to too many attempts
    if (user.otpAttempts !== undefined && user.otpAttempts >= 5) {
      user.otp = undefined;
      user.otpExpiryAt = undefined;
      user.otpAttempts = 0;
      await user.save();
      await logSystemEvent({
        action: "email_verification_locked",
        details: "OTP locked: too many verification attempts.",
        severity: "warning",
        category: "auth",
        actor: email,
        targetId: user._id,
        targetModel: "User",
        targetName: user.name,
      });
      return NextResponse.json(
        { message: "Too many failed attempts. This OTP has been locked. Please request a new one." },
        { status: 400 }
      );
    }

    // 3. Check for expiration
    if (user.otpExpiryAt && user.otpExpiryAt < new Date()) {
      user.otp = undefined;
      user.otpExpiryAt = undefined;
      user.otpAttempts = 0;
      await user.save();
      await logSystemEvent({
        action: "email_verification_failed",
        details: "Verification attempt failed: OTP expired.",
        severity: "warning",
        category: "auth",
        actor: email,
        targetId: user._id,
        targetModel: "User",
        targetName: user.name,
      });
      return NextResponse.json(
        { message: "OTP has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // 4. Secure bcrypt comparison
    const isMatch = await bcrypt.compare(otp, user.otp);
    if (!isMatch) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      const attemptsLeft = 5 - user.otpAttempts;
      if (user.otpAttempts >= 5) {
        user.otp = undefined;
        user.otpExpiryAt = undefined;
        user.otpAttempts = 0;
        await user.save();
        await logSystemEvent({
          action: "email_verification_locked",
          details: "OTP locked: too many invalid attempts.",
          severity: "warning",
          category: "auth",
          actor: email,
          targetId: user._id,
          targetModel: "User",
          targetName: user.name,
        });
        return NextResponse.json(
          { message: "Too many failed attempts. This OTP has been locked. Please request a new one." },
          { status: 400 }
        );
      }
      await user.save();
      await logSystemEvent({
        action: "email_verification_invalid_otp",
        details: `Invalid OTP entered. ${attemptsLeft} attempts remaining.`,
        severity: "warning",
        category: "auth",
        actor: email,
        targetId: user._id,
        targetModel: "User",
        targetName: user.name,
      });
      return NextResponse.json(
        { message: `Invalid OTP. ${attemptsLeft} attempts remaining.` },
        { status: 400 }
      );
    }

    // 5. Successful verification
    user.isEmailVerified = true;
    user.otp = undefined;
    user.otpExpiryAt = undefined;
    user.otpAttempts = 0;
    await user.save();

    await logSystemEvent({
      action: "email_verified",
      details: "Email verified successfully.",
      severity: "info",
      category: "auth",
      actor: email,
      targetId: user._id,
      targetModel: "User",
      targetName: user.name,
    });

    return NextResponse.json(
      { message: "Email verified successfully" },
      { status: 200 }
    );

  } catch (error: any) {
    console.error("[verify-email] error:", error);
    await logSystemEvent({
      action: "email_verification_error",
      details: `Internal error during email verification for ${requestEmail}: ${error.message || error}`,
      severity: "error",
      category: "auth",
      actor: requestEmail,
    });
    return NextResponse.json(
      { message: "An internal server error occurred during email verification." },
      { status: 500 }
    );
  }
}