import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { creditWallet } from "@/lib/wallet";
import User from "@/models/user.model";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Ensure the caller is an admin
    const currentUser = await User.findById(session.user.id);
    if (currentUser?.role !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { userId, amount, reason } = body;

    if (!userId || !amount || !reason) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const wallet = await creditWallet(userId, Number(amount), reason);
    
    return NextResponse.json({
      success: true,
      balance: wallet.balance,
    });
  } catch (error: any) {
    console.error("Failed to credit wallet:", error);
    return NextResponse.json(
      { message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
