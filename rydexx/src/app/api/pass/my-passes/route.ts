import connectDb from "@/lib/db";
import Pass from "@/models/pass.model";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDb();
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    // Keep the persisted flag in sync so old expired/exhausted passes don't
    // continue to look active in clients that rely on isActive.
    await Pass.updateMany(
      {
        userId: session.user.id,
        isActive: true,
        $or: [{ balance: { $lte: 0 } }, { expiresAt: { $lte: now } }],
      },
      { $set: { isActive: false } },
    );

    // Return history too; the client separates active passes from past passes
    // using the same expiry, balance, and isActive rules used by validation.
    const passes = await Pass.find({ userId: session.user.id })
      .select("-redeemedBookingIds -redeemedTokenIds")
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json({ success: true, passes });
  } catch (error: unknown) {
    console.error("Error fetching passes:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Failed to load passes" },
      { status: 500 },
    );
  }
}
