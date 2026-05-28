import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";
import { auth } from "@/lib/auth";
import { notifyAdminDashboard } from "@/lib/adminEvents";
import { emitToSocketServer } from "@/lib/socketServer";

export async function POST(req: Request) {
  await connectDb();

  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const {
    driverId,
    vehicleId,
    pickupAddress,
    dropAddress,
    pickupLocation,
    dropLocation,
    fare,
    mobileNumber, // This is user's mobile number from frontend
    vehicleType,
  } = body;

  if (
    !pickupLocation?.coordinates ||
    !dropLocation?.coordinates
  ) {
    return NextResponse.json(
      { message: "Missing required coordinates fields" },
      { status: 400 }
    );
  }

  // Prevent duplicate active booking
  const existing = await Booking.findOne({
    user: session.user.id,
    status: {
      $in: ["requested", "awaiting_payment", "confirmed", "arriving", "arrived", "started"],
    },
  });

  if (existing) {
    return NextResponse.json({ success: true, booking: existing });
  }

  let matchedDriverId = driverId;
  let matchedVehicleId = vehicleId;
  let matchedDriverMobile = "";
  const resolvedVehicleType = vehicleType || "car";

  if (!matchedDriverId || !matchedVehicleId) {
    // Geospatial search: Find closest online approved driver
    const partners = await User.find({
      role: "partner",
      isOnline: true,
      partnerStatus: "approved",
      isPartnerBlocked: { $ne: true },
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: pickupLocation.coordinates,
          },
          $maxDistance: 5000, // 5km limit
        },
      },
    }).select("_id mobileNumber").lean();

    const partnerIds = partners.map((p) => p._id);
    if (!partnerIds.length) {
      return NextResponse.json(
        { message: "No drivers available nearby" },
        { status: 404 }
      );
    }

    // Find vehicles of these partners that match the type
    const vehicles = await Vehicle.find({
      owner: { $in: partnerIds },
      status: "approved",
      isActive: true,
      type: resolvedVehicleType,
    }).lean();

    let matchedDriver = null;
    let matchedVehicle = null;

    for (const partner of partners) {
      const v = vehicles.find((v) => String(v.owner) === String(partner._id));
      if (v) {
        matchedDriver = partner;
        matchedVehicle = v;
        break;
      }
    }

    if (!matchedDriver || !matchedVehicle) {
      return NextResponse.json(
        { message: "No matching vehicles available nearby" },
        { status: 404 }
      );
    }

    matchedDriverId = matchedDriver._id;
    matchedVehicleId = matchedVehicle._id;
    matchedDriverMobile = matchedDriver.mobileNumber;
  } else {
    // If driverId/vehicleId explicitly passed, verify the driver
    const driver = await User.findById(matchedDriverId).select("mobileNumber");
    if (!driver) {
      return NextResponse.json(
        { message: "Driver not found" },
        { status: 404 }
      );
    }
    matchedDriverMobile = driver.mobileNumber;
  }

  const booking = await Booking.create({
    user: session.user.id,
    driver: matchedDriverId,
    vehicle: matchedVehicleId,
    pickupAddress,
    dropAddress,
    pickupLocation,
    dropLocation,
    fare,
    userMobileNumber: mobileNumber, // Mobile number from frontend (user's)
    driverMobileNumber: matchedDriverMobile, // Mobile number from database (driver's)
    status: "requested",
    attemptedDrivers: [matchedDriverId],
    vehicleType: resolvedVehicleType,
    driverAssignedAt: new Date(),
  });
  
  await emitToSocketServer({
    userId: String(matchedDriverId),
    event: "new-booking",
    data: booking,
  });

  await notifyAdminDashboard({ scope: "map", reason: "booking-created" });

  return NextResponse.json({ success: true, booking });
}
