import connectDb from "@/lib/db";
import { sendMail } from "@/lib/sendMail";
import User from "@/models/user.model";
import bcrypt from "bcryptjs";
import { getOtpEmailTemplate } from "@/lib/emailTemplate";
import { NextRequest, NextResponse } from "next/server";
import { logSystemEvent } from "@/lib/auditLogger";

export async function POST(req: NextRequest) {
  let requestEmail = "unknown";
  try {
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    requestEmail = email || "unknown";

    if (!name || !email || !password) {
      return NextResponse.json(
        { message: "Name, email, and password are required" },
        { status: 400 },
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: "Invalid email format" },
        { status: 400 },
      );
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return NextResponse.json(
        { message: "Password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character" },
        { status: 400 },
      );
    }

    await connectDb();
    let user = await User.findOne({ email });
    if (user && user.isEmailVerified) {
      return NextResponse.json(
        { message: "Email already exists!" },
        { status: 400 },
      );
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiryAt = new Date(Date.now() + 10 * 60 * 1000);
    const hashedOtp = await bcrypt.hash(otp, 10);

    const hashedPassword = await bcrypt.hash(password, 10);
    if (user && !user.isEmailVerified) {
      user.name = name;
      user.password = hashedPassword;
      user.email = email;
      user.otp = hashedOtp;
      user.otpExpiryAt = otpExpiryAt;
      user.otpAttempts = 0;
      await user.save();
    } else {
      user = await User.create({
        name,
        email,
        password: hashedPassword,
        otp: hashedOtp,
        otpExpiryAt,
        otpAttempts: 0,
      });
    }
    await sendMail(
      email,
      "Verify Your Email - Rydex",
      getOtpEmailTemplate(otp, "Thank you for registering with Rydex! Please use the following OTP to verify your email address.", "Verify Your Email")
    );
    
    await logSystemEvent({
      action: "user_signup",
      details: `User registered with email: ${email}`,
      severity: "info",
      category: "auth",
      actor: email,
      targetId: user._id,
      targetModel: "User",
      targetName: name,
    });

    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
    };

    return NextResponse.json({ message: "Registration successful", user: userResponse }, { status: 201 });
  } catch (error: any) {
    console.error("Registration error:", error);
    
    await logSystemEvent({
      action: "user_signup_failed",
      details: `Signup attempt failed for email: ${requestEmail}. Error: ${error.message || error}`,
      severity: "error",
      category: "auth",
      actor: requestEmail,
    });

    // Provide a generic error message to the client to avoid leaking sensitive details
    // like the email body (OTP) if the mailer fails.
    let errorMessage = "An error occurred during registration. Please try again.";
    
    if (error.name === "ValidationError") {
      errorMessage = "Validation error. Please check your inputs.";
    } else if (error.code === 11000) {
      errorMessage = "Email already registered.";
    }

    return NextResponse.json(
      {
        message: errorMessage,
      },
      { status: 500 },
    );
  }
}
