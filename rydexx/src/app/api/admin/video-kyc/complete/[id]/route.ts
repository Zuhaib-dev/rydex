import { notifyAdminDashboard } from "@/lib/adminEvents";
import { auth } from "@/lib/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import { emitToSocketServer } from "@/lib/socketServer";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await connectDb();
    const session = await auth();
    if (!session || !session.user?.email || session.user?.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const partnerId = (await context.params).id;
    const body = await request.json();
    const { action, reason } = body as {
      action: "approved" | "rejected";
      reason?: string;
    };

    if (!["approved", "rejected"].includes(action)) {
      return NextResponse.json(
        { message: "Invalid action. Must be 'approved' or 'rejected'." },
        { status: 400 },
      );
    }

    const partner = await User.findById(partnerId);
    if (!partner || partner.role !== "partner") {
      return NextResponse.json(
        { message: "Partner not found" },
        { status: 404 },
      );
    }

    partner.videoKycStatus = action;
    partner.videoKycRoomId = undefined;
    if (action === "rejected" && reason) {
      partner.videoKycRejectionReason = reason;
    }
    if (action === "approved") {
      partner.partnerOnboardingSteps = 5;
    }
    await partner.save();

    // Log the admin action
    const { logAdminAction } = await import("@/lib/auditLogger");
    await logAdminAction({
      adminEmail: session.user.email,
      action: `${action}_video_kyc`,
      targetId: partner._id,
      targetModel: "User",
      targetName: partner.name,
      details: action === "approved" 
        ? "Approved partner Video KYC (Moved to Step 5)." 
        : `Rejected partner Video KYC. Reason: ${reason}`
    });

    await notifyAdminDashboard({ scope: "dashboard", reason: `kyc-${action}` });

    // Push notification — inform partner of KYC outcome
    const pushData = action === "approved"
      ? {
          title: "✅ KYC Approved!",
          message: "Your Video KYC has been verified. Proceed to add your vehicle to complete activation.",
          type: "KYC_APPROVED",
          url: "/partner/onboarding",
        }
      : {
          title: "❌ KYC Rejected",
          message: reason
            ? `Your Video KYC was rejected. Reason: ${reason}. Please re-submit a new KYC session.`
            : "Your Video KYC was not approved. Please contact support or re-submit.",
          type: "KYC_REJECTED",
          url: "/partner/video-kyc",
        };

    await emitToSocketServer({
      userId: String(partner._id),
      event: "new-notification",
      data: pushData,
    }).catch((err) => console.warn(`[push] KYC ${action} push failed:`, err));

    return NextResponse.json({
      message: `Video KYC ${action} successfully`,
    });
  } catch (error: any) {
    console.error("Server error:", error);
    return NextResponse.json(
      { message: "An internal server error occurred." },
      { status: 500 },
    );
  }
}
