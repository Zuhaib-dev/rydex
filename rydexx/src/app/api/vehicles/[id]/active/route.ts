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

    // Set the user's activeVehicleId
    await User.findByIdAndUpdate(session.user.id, {
      $set: { 
        activeVehicleId: vehicle._id,
        currentVehicleType: vehicle.type // Sync the current vehicle type
      }
    });

    return NextResponse.json({
      message: "Vehicle activated successfully",
      activeVehicleId: vehicle._id,
    });
  } catch (error: any) {
    console.error("Toggle active vehicle error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
