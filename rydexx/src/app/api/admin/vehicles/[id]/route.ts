import { auth } from "@/lib/auth";
import connectDb from "@/lib/db";
import Vehicle from "@/models/vehicle.model";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDb();
    const session = await auth();
    if (!session || !session.user?.email || session.user?.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { status } = await request.json();
    const vehicleId = (await context.params).id;

    if (!["approved", "suspended", "rejected", "pending"].includes(status)) {
      return NextResponse.json({ message: "Invalid status" }, { status: 400 });
    }

    const vehicle = await Vehicle.findByIdAndUpdate(
      vehicleId,
      { status },
      { new: true }
    );

    if (!vehicle) {
      return NextResponse.json({ message: "Vehicle not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, vehicle });
  } catch (error: any) {
    console.error("Update vehicle status error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
