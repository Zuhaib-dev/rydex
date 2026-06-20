import { NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@/lib/auth";
import { creditWallet } from "@/lib/wallet";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { amount, razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

    if (!amount || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const secretKey = process.env.RAZORPAY_KEY_SECRET;
    if (!secretKey) {
      console.error("[verify-topup] RAZORPAY_KEY_SECRET is not configured in the environment.");
      return NextResponse.json({ success: false, error: "Payment verification misconfigured" }, { status: 500 });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", secretKey)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ success: false, error: "Invalid signature" }, { status: 400 });
    }

    // Safely credit the wallet
    await creditWallet(
      session.user.id,
      amount,
      `Wallet Top-up (Razorpay: ${razorpay_payment_id})`
    );

    return NextResponse.json({ success: true, message: "Top-up successful" });
  } catch (error: any) {
    console.error("Wallet topup verify error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
