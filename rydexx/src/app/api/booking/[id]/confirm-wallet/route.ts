import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import { debitWallet } from "@/lib/wallet";
import { auth } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await connectDb();

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return NextResponse.json({ message: "Booking not found" }, { status: 404 });
    }

    if (booking.paymentStatus === "paid") {
      return NextResponse.json({ message: "Already paid" }, { status: 400 });
    }

    // Debit wallet atomically
    try {
      await debitWallet(
        session.user.id,
        booking.fare,
        `Payment for ride #${booking._id.toString().slice(-6).toUpperCase()}`,
        booking._id
      );
    } catch (error: any) {
      return NextResponse.json(
        { message: error.message || "Insufficient balance in wallet" },
        { status: 400 }
      );
    }

    booking.paymentMethod = "wallet";
    booking.paymentStatus = "paid";
    if (booking.status === "awaiting_payment") {
      booking.status = "payment";
    }
    await booking.save();

    return NextResponse.json({ success: true, booking });
  } catch (error: any) {
    console.error("Wallet confirm error:", error);
    return NextResponse.json(
      { message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
