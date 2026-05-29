import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";
import Booking from "@/models/booking.model";
import SurgeZone from "@/models/surgeZone.model";

export async function GET() {
  try {
    const session = await auth();
    
    if (!session || session.user?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // 1. Fetch all online drivers (partners) with location
    const drivers = await User.find({
      role: "partner",
      isOnline: true,
      location: { $exists: true },
    }).select("name mobileNumber location image socketId lastLocationAt _id").lean();

    // Fetch vehicles for these drivers to know their vehicleType (car, bike, truck)
    const driverIds = drivers.map(d => d._id);
    const vehicles = await Vehicle.find({
      owner: { $in: driverIds },
      isActive: true,
      status: "approved"
    }).select("owner type").lean();

    const vehicleMap = new Map();
    vehicles.forEach(v => {
      vehicleMap.set(v.owner.toString(), v.type);
    });

    const driversWithVehicleType = drivers.map(d => ({
      ...d,
      vehicleType: vehicleMap.get(d._id.toString()) || "car" // Default to car if no vehicle found
    }));

    // 2. Fetch active rides
    const activeRides = await Booking.find({
      status: { $in: ["arriving", "started"] }
    }).select("pickupLocation dropLocation driver status user sosTriggered sosTriggeredAt").lean();

    // 3. Fetch active surge zones
    const surgeZones = await SurgeZone.find({ isActive: true }).lean();

    return NextResponse.json({
      success: true,
      data: {
        drivers: driversWithVehicleType,
        activeRides,
        surgeZones,
        updatedAt: new Date().toISOString(),
      }
    });

  } catch (error: unknown) {
    console.error("Live map data fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch live map data" },
      { status: 500 }
    );
  }
}
