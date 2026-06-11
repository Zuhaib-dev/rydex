import { notifyAdminDashboard } from "@/lib/adminEvents";
import { auth } from "@/lib/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";
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
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const vehicleId = (await context.params).id;
    const vehicle = await Vehicle.findById(vehicleId).populate("owner", "name email partnerStatus partnerOnboardingSteps rejectionReason mobileNumber");

    if (!vehicle) {
      return NextResponse.json({ message: "Vehicle not found" }, { status: 404 });
    }

    return NextResponse.json({ vehicle });
  } catch (error) {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await connectDb();
    const session = await auth();
    if (!session || !session.user?.email || session.user?.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const vehicleId = (await context.params).id;
    const { action, reason } = await request.json();

    if (!["approved", "rejected", "suspended"].includes(action)) {
      return NextResponse.json({ message: "Invalid action" }, { status: 400 });
    }

    if ((action === "rejected" || action === "suspended") && !reason?.trim()) {
      return NextResponse.json({ message: "Reason is required for rejection/suspension" }, { status: 400 });
    }

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return NextResponse.json({ message: "Vehicle not found" }, { status: 404 });
    }

    const user = await User.findById(vehicle.owner);
    if (!user) {
      return NextResponse.json({ message: "Vehicle owner not found" }, { status: 404 });
    }

    vehicle.status = action;
    vehicle.rejectionReason = (action === "rejected" || action === "suspended") ? reason : "";
    await vehicle.save();

    // Only update general partner status/steps if onboarding is incomplete
    if (user.partnerOnboardingSteps < 8) {
      if (action === "approved") {
        user.partnerStatus = "approved";
        user.partnerOnboardingSteps = 8;
        user.activeVehicleId = vehicle._id;
      } else {
        user.partnerStatus = "rejected";
        user.partnerOnboardingSteps = 6;
        user.rejectionReason = reason;
      }
      await user.save();
    } else {
      // If driver is already live, check if the suspended/rejected vehicle was their active vehicle
      if (action !== "approved" && String(user.activeVehicleId) === String(vehicle._id)) {
        user.activeVehicleId = undefined;
        await user.save();
      } else if (action === "approved" && !user.activeVehicleId) {
        // Automatically activate it if they had no active vehicle
        user.activeVehicleId = vehicle._id;
        await user.save();
      }
    }

    // Log the admin action
    const { logAdminAction } = await import("@/lib/auditLogger");
    await logAdminAction({
      adminEmail: session.user.email,
      action: `${action}_vehicle`,
      targetId: vehicle._id,
      targetModel: "Vehicle",
      targetName: `${vehicle.vehicleModel} (${vehicle.vehicleNumber})`,
      details: action === "approved" 
        ? "Approved vehicle and finalized driver onboarding (Step 8)." 
        : `Vehicle status set to ${action}. Reason: ${reason}`
    });

    await notifyAdminDashboard({
      scope: "dashboard",
      reason: `vehicle-${action}`,
    });

    // Push notification — inform the vehicle owner of the review outcome
    const ownerId = String(vehicle.owner);
    if (action === "approved" && user.partnerOnboardingSteps >= 8) {
      // Full account activation — most important push in the partner journey
      await emitToSocketServer({
        userId: ownerId,
        event: "new-notification",
        data: {
          title: "🎉 You're Live on Rydex!",
          message: "Your vehicle has been approved. Your account is fully activated — go online and start accepting rides!",
          type: "PARTNER_ACCOUNT_APPROVED",
          url: "/partner/dashboard",
        },
      }).catch((err) => console.warn("[push] Partner account approval push failed:", err));
    } else if (action === "rejected") {
      await emitToSocketServer({
        userId: ownerId,
        event: "new-notification",
        data: {
          title: "⚠️ Vehicle Not Approved",
          message: reason
            ? `Your vehicle was not approved. Reason: ${reason}. Please re-submit with correct details.`
            : "Your vehicle was not approved. Please check your documents and re-submit.",
          type: "VEHICLE_REJECTED",
          url: "/partner/onboarding",
        },
      }).catch((err) => console.warn("[push] Vehicle rejection push failed:", err));
    } else if (action === "suspended") {
      await emitToSocketServer({
        userId: ownerId,
        event: "new-notification",
        data: {
          title: "🚫 Vehicle Suspended",
          message: reason
            ? `Your vehicle has been suspended. Reason: ${reason}. Contact support for assistance.`
            : "Your vehicle has been suspended by the admin.",
          type: "VEHICLE_SUSPENDED",
          url: "/partner/dashboard",
        },
      }).catch((err) => console.warn("[push] Vehicle suspension push failed:", err));
    }

    return NextResponse.json({ message: `Vehicle ${action} successfully` });
  } catch (error) {
    console.error("Admin vehicle review error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
