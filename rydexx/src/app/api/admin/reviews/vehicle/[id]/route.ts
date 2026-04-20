import { auth } from "@/lib/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";
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

    if (!["approved", "rejected"].includes(action)) {
      return NextResponse.json({ message: "Invalid action" }, { status: 400 });
    }

    if (action === "rejected" && !reason?.trim()) {
      return NextResponse.json({ message: "Reason is required for rejection" }, { status: 400 });
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
    vehicle.rejectionReason = action === "rejected" ? reason : "";
    await vehicle.save();

    user.partnerStatus = action;
    user.rejectionReason = action === "rejected" ? reason : "";
    
    if (action === "approved") {
      user.partnerOnboardingSteps = 8;
    } else {
      user.partnerOnboardingSteps = 6;
    }

    await user.save();

    return NextResponse.json({ message: `Vehicle ${action} successfully` });
  } catch (error) {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
