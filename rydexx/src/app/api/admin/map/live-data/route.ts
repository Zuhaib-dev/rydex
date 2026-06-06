import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";
import Booking from "@/models/booking.model";
import SurgeZone from "@/models/surgeZone.model";
import { getRedisClient } from "@/lib/redis";

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
      partnerStatus: "approved",
      location: { $exists: true },
    }).select("name email mobileNumber location image socketId lastLocationAt _id activeVehicleId currentVehicleType").lean();

    // Fetch only active vehicles for these drivers to know their current vehicleType (car, bike, truck, etc.)
    const activeVehicleIds = drivers
      .map(d => d.activeVehicleId)
      .filter(id => id != null);

    const activeVehicles = await Vehicle.find({
      _id: { $in: activeVehicleIds },
      isActive: true,
      status: "approved"
    }).select("owner type").lean();

    const vehicleMap = new Map();
    activeVehicles.forEach(v => {
      vehicleMap.set(v.owner.toString(), v.type);
    });

    // Fallback: If a driver doesn't have an activeVehicleId or the vehicle wasn't found/approved,
    // look up any approved vehicle of theirs.
    const remainingDriverIds = drivers
      .filter(d => !d.activeVehicleId || !vehicleMap.has(d._id.toString()))
      .map(d => d._id);

    if (remainingDriverIds.length > 0) {
      const fallbackVehicles = await Vehicle.find({
        owner: { $in: remainingDriverIds },
        isActive: true,
        status: "approved"
      }).select("owner type").lean();

      fallbackVehicles.forEach(v => {
        const key = v.owner.toString();
        if (!vehicleMap.has(key)) {
          vehicleMap.set(key, v.type);
        }
      });
    }

    const driversWithVehicleType = drivers.map(d => ({
      ...d,
      vehicleType: vehicleMap.get(d._id.toString()) || d.currentVehicleType || "car" // Default to car if no vehicle found
    }));

    // 2. Fetch active rides
    const activeRides = await Booking.find({
      status: { $in: ["requested", "arriving", "started"] }
    }).select("pickupLocation dropLocation driver status user vehicleType sosTriggered sosTriggeredAt").lean();

    // 3. Fetch active surge zones (with Redis cache fallback, 2-minute TTL)
    const redis = getRedisClient();
    const cacheKey = "cache:surge_zones";
    let surgeZones = null;
    try {
      const cachedZones = await redis.get(cacheKey);
      if (cachedZones) {
        surgeZones = JSON.parse(cachedZones);
      }
    } catch (err) {
      console.error("Redis error reading surge zones cache:", err);
    }

    if (!surgeZones) {
      surgeZones = await SurgeZone.find({ isActive: true }).lean();
      try {
        await redis.set(cacheKey, JSON.stringify(surgeZones), "EX", 120);
      } catch (err) {
        console.error("Redis error writing surge zones cache:", err);
      }
    }

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
