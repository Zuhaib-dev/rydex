import { auth } from "@/lib/auth";
import connectDb from "@/lib/db";
import Vehicle from "@/models/vehicle.model";
import User from "@/models/user.model";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
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
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // Soft delete
    vehicle.isActive = false;
    await vehicle.save();

    // Check if this was the active vehicle
    const user = await User.findById(session.user.id);
    if (user && String(user.activeVehicleId) === String(vehicle._id)) {
      user.activeVehicleId = undefined;
      await user.save();
    }

    return NextResponse.json({ message: "Vehicle removed successfully" });
  } catch (error: any) {
    console.error("Delete vehicle error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
