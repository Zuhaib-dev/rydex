import { notifyAdminDashboard } from "@/lib/adminEvents";
import { auth } from "@/lib/auth";
import connectDb from "@/lib/db";
import { logAdminAction } from "@/lib/auditLogger";
import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";
import PartnerBank from "@/models/partnerBank.model";
import PartnerDocs from "@/models/partnerDocs.model";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    await connectDb();
    const session = await auth();
    if (!session || !session.user?.email || session.user?.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { ids, type, action, reason } = body as {
      ids: string[];
      type: "partner" | "vehicle";
      action: "approve" | "reject";
      reason?: string;
    };

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ message: "No IDs provided" }, { status: 400 });
    }

    if (!["partner", "vehicle"].includes(type) || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ message: "Invalid parameters" }, { status: 400 });
    }

    const processedIds: string[] = [];

    if (type === "partner") {
      for (const partnerId of ids) {
        const partner = await User.findById(partnerId);
        if (!partner || partner.role !== "partner" || partner.partnerStatus === "approved") {
          continue;
        }

        if (action === "approve") {
          const partnerDocs = await PartnerDocs.findOne({ owner: partner._id });
          const partnerBank = await PartnerBank.findOne({ owner: partner._id });
          if (!partnerDocs || !partnerBank) continue;

          partner.partnerStatus = "pending";
          partner.videoKycStatus = "pending";
          partner.partnerOnboardingSteps = 4;
          await partner.save();

          partnerDocs.status = "approved";
          partnerBank.status = "verified";
          await partnerDocs.save();
          await partnerBank.save();

          await logAdminAction({
            adminEmail: session.user.email,
            action: "approve_partner_documents",
            targetId: partner._id,
            targetModel: "User",
            targetName: partner.name,
            details: "Bulk approved partner documents and set to pending Video KYC."
          });
        } else {
          partner.partnerStatus = "rejected";
          partner.rejectionReason = reason || "Bulk rejected";
          await partner.save();

          await logAdminAction({
            adminEmail: session.user.email,
            action: "reject_partner",
            targetId: partner._id,
            targetModel: "User",
            targetName: partner.name,
            details: `Bulk rejected partner. Reason: ${reason || "None specified"}`
          });
        }
        processedIds.push(partnerId);
      }
    } else {
      // Vehicle bulk action
      for (const vehicleId of ids) {
        const vehicle = await Vehicle.findById(vehicleId);
        if (!vehicle) continue;

        const user = await User.findById(vehicle.owner);
        if (!user) continue;

        const statusStr = action === "approve" ? "approved" : "rejected";
        vehicle.status = statusStr;
        vehicle.rejectionReason = action === "reject" ? (reason || "Bulk rejected") : "";
        await vehicle.save();

        user.partnerStatus = statusStr;
        user.rejectionReason = action === "reject" ? (reason || "Bulk rejected") : "";
        user.partnerOnboardingSteps = action === "approve" ? 8 : 6;
        await user.save();

        await logAdminAction({
          adminEmail: session.user.email,
          action: `${statusStr}_vehicle`,
          targetId: vehicle._id,
          targetModel: "Vehicle",
          targetName: `${vehicle.vehicleModel} (${vehicle.vehicleNumber})`,
          details: action === "approve" 
            ? "Bulk approved vehicle and finalized driver onboarding (Step 8)." 
            : `Bulk rejected vehicle. Reason: ${reason || "None specified"}`
        });
        processedIds.push(vehicleId);
      }
    }

    await notifyAdminDashboard({
      scope: "dashboard",
      reason: `bulk-${type}-${action}`,
    });

    return NextResponse.json({
      message: `Bulk ${action} action completed successfully for ${processedIds.length} items.`,
      processedCount: processedIds.length,
    });
  } catch (error: any) {
    console.error("Bulk action error:", error);
    return NextResponse.json(
      { message: "An internal server error occurred." },
      { status: 500 }
    );
  }
}
