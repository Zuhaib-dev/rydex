import { auth } from "@/lib/auth";
import connectDb from "@/lib/db";
import Vehicle from "@/models/vehicle.model";
import User from "@/models/user.model";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDb();
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const vehicleId = (await context.params).id;
    const vehicle = await Vehicle.findById(vehicleId);

    if (!vehicle || !vehicle.isActive) {
      return NextResponse.json({ message: "Vehicle not found" }, { status: 404 });
    }

    if (String(vehicle.owner) !== session.user.id) {
      return NextResponse.json({ message: "You do not own this vehicle" }, { status: 403 });
    }

    if (vehicle.status !== "approved") {
      return NextResponse.json({ message: "Only approved vehicles can be activated" }, { status: 400 });
    }

    // Set the user's activeVehicleId with 1-hour switch cooldown lock
    const currentUser = await User.findById(session.user.id);
    if (!currentUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // If it is already active, return success directly
    if (currentUser.activeVehicleId && String(currentUser.activeVehicleId) === String(vehicle._id)) {
      return NextResponse.json({
        message: "Vehicle is already active",
        activeVehicleId: vehicle._id,
      });
    }

    if (currentUser.vehicleLastActivatedAt) {
      const lockDuration = 60 * 60 * 1000; // 1 hour
      const elapsed = Date.now() - new Date(currentUser.vehicleLastActivatedAt).getTime();
      if (elapsed < lockDuration) {
        const remainingMinutes = Math.ceil((lockDuration - elapsed) / 60000);
        return NextResponse.json(
          { message: `You can only switch your active vehicle once per hour. Please wait ${remainingMinutes} more minutes.` },
          { status: 400 }
        );
      }
    }

    currentUser.activeVehicleId = vehicle._id;
    currentUser.currentVehicleType = vehicle.type;
    currentUser.vehicleLastActivatedAt = new Date();
    await currentUser.save();

    return NextResponse.json({
      message: "Vehicle activated successfully",
      activeVehicleId: vehicle._id,
    });
  } catch (error: any) {
    console.error("Toggle active vehicle error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
