import { notifyAdminDashboard } from "@/lib/adminEvents";
import { auth } from "@/lib/auth";
import connectDb from "@/lib/db";
import { logAdminAction } from "@/lib/auditLogger";
import User from "@/models/user.model";
import { NextRequest, NextResponse } from "next/server";
import { emitToSocketServer } from "@/lib/socketServer";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDb();
    const session = await auth();
    if (!session || !session.user?.email || session.user?.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = (await context.params).id;
    const body = await request.json();
    const { block } = body as { block: boolean };

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Toggle blocking
    user.isPartnerBlocked = block;
    await user.save();

    if (block) {
      await emitToSocketServer({
        userId: user._id.toString(),
        event: "blocked",
        data: { message: "Your account has been suspended by the administrator." },
      }).catch((err) => console.warn("Failed to emit block event:", err));
    }

    // Log the admin action
    await logAdminAction({
      adminEmail: session.user.email,
      action: block ? "block_user" : "unblock_user",
      targetId: user._id,
      targetModel: "User",
      targetName: user.name,
      details: block
        ? `Blocked user/partner. Access suspended or excluded from matchmaking.`
        : `Unblocked user/partner. Restored access.`
    });

    // Notify other dashboards of changes
    await notifyAdminDashboard({ scope: "dashboard", reason: "user-blocked-toggled" });

    return NextResponse.json({
      message: `User ${block ? "blocked" : "unblocked"} successfully`,
      isPartnerBlocked: user.isPartnerBlocked,
    });
  } catch (error: any) {
    console.error("Block user error:", error);
    return NextResponse.json(
      { message: "An internal server error occurred." },
      { status: 500 }
    );
  }
}
