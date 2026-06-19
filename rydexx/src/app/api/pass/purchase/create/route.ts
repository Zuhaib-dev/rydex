import { NextResponse } from "next/server";
import razorpay from "@/lib/razorpay";
import connectDb from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  await connectDb();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 7-Day Commuter pass is hardcoded to 500 INR for the demo.
    const order = await razorpay.orders.create({
      amount: 500 * 100, // 500 INR in paise
      currency: "INR",
      receipt: `pass_${session.user.id}_${Date.now()}`,
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
    });
  } catch (error: any) {
    console.error("Pass order creation error:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
