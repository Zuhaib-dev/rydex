import { NextResponse } from "next/server";
import razorpay from "@/lib/razorpay";
import connectDb from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    await connectDb();

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { amount } = await req.json();

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount for top-up" },
        { status: 400 }
      );
    }

    // Minimum topup of 1 INR
    if (amount < 1) {
      return NextResponse.json(
        { error: "Minimum top-up amount is ₹1" },
        { status: 400 }
      );
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `topup_${session.user.id}_${Date.now()}`,
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error: any) {
    console.error("Wallet topup create error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
