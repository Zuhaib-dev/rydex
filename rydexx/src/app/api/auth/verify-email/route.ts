import connectDb from "@/lib/db";
import User from "@/models/user.model";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    await connectDb();
    const { email, otp } = await req.json();
    console.log("[verify-email] received:", { email, otp: otp ? "[EXISTS]" : "[MISSING]" });

    if (!email || !otp) {
      return Response.json(
        { message: "Please provide email and otp" },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email });
    if (!user) {
      return Response.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    // 1. Check if OTP exists
    if (!user.otp) {
      return Response.json(
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
      return Response.json(
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
      return Response.json(
        { message: "OTP has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // 4. Secure bcrypt comparison
    const isMatch = await bcrypt.compare(otp, user.otp);
    if (!isMatch) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      if (user.otpAttempts >= 5) {
        user.otp = undefined;
        user.otpExpiryAt = undefined;
        user.otpAttempts = 0;
        await user.save();
        return Response.json(
          { message: "Too many failed attempts. This OTP has been locked. Please request a new one." },
          { status: 400 }
        );
      }
      await user.save();
      return Response.json(
        { message: `Invalid OTP. ${5 - user.otpAttempts} attempts remaining.` },
        { status: 400 }
      );
    }

    // 5. Successful verification
    user.isEmailVerified = true;
    user.otp = undefined;
    user.otpExpiryAt = undefined;
    user.otpAttempts = 0;
    await user.save();

    return Response.json(
      { message: "Email verified successfully" },
      { status: 200 }
    );

  } catch (error: any) {
    console.error("[verify-email] error:", error);
    return Response.json(
      { message: "An internal server error occurred during email verification." },
      { status: 500 }
    );
  }
}