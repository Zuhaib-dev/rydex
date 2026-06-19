import connectDb from "@/lib/db";
import Pass from "@/models/pass.model";
import crypto from "crypto";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  await connectDb();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

  const secretKey = process.env.RAZORPAY_KEY_SECRET;
  if (!secretKey) {
    console.error("[verify-pass-payment] RAZORPAY_KEY_SECRET is not configured.");
    return NextResponse.json({ success: false, message: "Server misconfiguration." }, { status: 500 });
  }

  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto.createHmac("sha256", secretKey).update(body).digest("hex");

  if (expectedSignature !== razorpay_signature) {
    return NextResponse.json({ success: false, message: "Invalid signature" }, { status: 400 });
  }

  // Provision pass
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7-Day Pass

  const pass = new Pass({
    userId: session.user.id,
    type: "7-Day Commuter Pass",
    balance: 10, // 10 rides per pass
    isActive: true,
    expiresAt,
  });

  await pass.save();

  return NextResponse.json({ success: true, pass });
}
