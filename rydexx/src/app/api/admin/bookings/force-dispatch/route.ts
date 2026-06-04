import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Booking from "@/models/booking.model";
import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";
import { getRedisClient } from "@/lib/redis";
import mongoose from "mongoose";
import { estimatePickupEtaMinutes, estimateRoadDistanceMeters } from "@/lib/matching/geo";
import { dispatchBookingToPartner } from "@/lib/matching/dispatch";

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session || session.user?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bookingId, partnerId } = await req.json();

    if (!bookingId || !partnerId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await dbConnect();

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (!["requested", "rejected", "cancelled"].includes(booking.status)) {
      return NextResponse.json({ error: `Cannot force dispatch booking with status: ${booking.status}` }, { status: 400 });
    }

    const partner = await User.findOne({ _id: partnerId, role: "partner" });
    if (!partner) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    const vehicle = await Vehicle.findOne({ owner: partnerId, isActive: true, status: "approved" });
    if (!vehicle) {
      return NextResponse.json({ error: "Partner has no active approved vehicle" }, { status: 400 });
    }

    const oldDriverId = booking.driver ? String(booking.driver) : undefined;

    // Release any old driver locks
    if (oldDriverId) {
      try {
        const redis = getRedisClient();
        await redis.del(`lock:driver:${oldDriverId}`);
      } catch (err) {
        console.warn("Failed to release old driver lock on force dispatch:", err);
      }
    }

    // Attempt to calculate realistic distance and ETA if partner has live location
    let distanceMeters = 2000;
    let etaMinutes = 5;
    
    if (partner.location?.coordinates && booking.pickupLocation?.coordinates) {
      const partnerLoc = partner.location.coordinates as [number, number];
      const pickupLoc = booking.pickupLocation.coordinates as [number, number];
      distanceMeters = estimateRoadDistanceMeters(partnerLoc, pickupLoc);
      etaMinutes = estimatePickupEtaMinutes(distanceMeters, vehicle.type);
    }

    // Update booking
    booking.driver = new mongoose.Types.ObjectId(partnerId);
    booking.vehicle = vehicle._id;
    booking.driverMobileNumber = partner.mobileNumber;
    booking.driverAssignedAt = new Date();
    booking.status = "requested";
    booking.matchRadiusMeters = 50000; // Large radius for forced
    
    // Add to attempted
    const attempted = booking.attemptedDrivers.map((id: any) => String(id));
    if (!attempted.includes(partnerId)) {
      booking.attemptedDrivers.push(new mongoose.Types.ObjectId(partnerId));
    }

    await booking.save();

    const matchedPartner = {
      partnerId: String(partner._id),
      name: partner.name,
      vehicleId: String(vehicle._id),
      vehicleType: vehicle.type,
      mobileNumber: partner.mobileNumber,
      coords: partner.location?.coordinates || [0, 0],
      distanceMeters,
      roadDistanceMeters: distanceMeters,
      etaMinutes
    };

    await dispatchBookingToPartner(booking, matchedPartner, booking.matchRadiusMeters || 50000, {
      previousDriverId: (oldDriverId && oldDriverId !== partnerId) ? oldDriverId : undefined
    });

    return NextResponse.json({
      success: true,
      message: `Force dispatched successfully to ${partner.name}`
    });

  } catch (error: any) {
    console.error("Force dispatch error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to force dispatch" },
      { status: 500 }
    );
  }
}
