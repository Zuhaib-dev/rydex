import { notifyAdminDashboard } from "@/lib/adminEvents";
import { auth } from "@/lib/auth";
import connectDb from "@/lib/db";
import PartnerBank from "@/models/partnerBank.model";
import PartnerDocs from "@/models/partnerDocs.model";
import User from "@/models/user.model";
import { emitToSocketServer } from "@/lib/socketServer";

import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await connectDb();
    const session = await auth();
    if (!session || !session.user?.email || session.user?.role !== "admin") {
      return Response.json({ message: "Unauthorized" }, { status: 400 });
    }
    await connectDb();
    const partnerId = (await context.params).id;
    const partner = await User.findById(partnerId);
    if (!partner || partner.role !== "partner") {
      return NextResponse.json(
        { message: "Partner Not Found" },
        { status: 400 },
      );
    }
    if (partner.partnerStatus === "approved") {
      return NextResponse.json(
        { message: "Partner Already Approved" },
        { status: 400 },
      );
    }
    const partnerDocs = await PartnerDocs.findOne({ owner: partner._id });
    const partnerBank = await PartnerBank.findOne({ owner: partner._id });
    
    partner.partnerStatus = "pending";
    partner.videoKycStatus='pending'
    partner.partnerOnboardingSteps = 4;
    await partner.save();
    
    if (partnerDocs) {
      partnerDocs.status = "approved";
      await partnerDocs.save();
    }
    
    if (partnerBank) {
      partnerBank.status = "verified";
      await partnerBank.save();
    }
    
    // Log the admin action
    const { logAdminAction } = await import("@/lib/auditLogger");
    await logAdminAction({
      adminEmail: session.user.email,
      action: "approve_partner_documents",
      targetId: partner._id,
      targetModel: "User",
      targetName: partner.name,
      details: "Approved partner documents and set status to pending Video KYC."
    });

    await notifyAdminDashboard({ scope: "dashboard", reason: "partner-approved" });

    // Push notification — inform partner that docs are approved and KYC is next
    await emitToSocketServer({
      userId: String(partner._id),
      event: "new-notification",
      data: {
        title: "📋 Documents Approved!",
        message: "Your documents have been verified. Complete the Video KYC step to activate your account.",
        type: "PARTNER_DOCS_APPROVED",
        url: "/partner/video-kyc",
      },
    }).catch((err) => console.warn("[push] Partner docs approval push failed:", err));

    return NextResponse.json(
      { message: "Partner Approved Successfully" },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Partner approval error:", error);
    return NextResponse.json(
      { message: "An internal server error occurred." },
      { status: 500 },
    );
  }
}
 