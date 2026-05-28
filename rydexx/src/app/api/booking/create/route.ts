import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import User from "@/models/user.model";
import { auth } from "@/lib/auth";
import { notifyAdminDashboard } from "@/lib/adminEvents";
import { findPartnerWithRadiusExpansion } from "@/lib/matching/findPartner";
import { dispatchBookingToPartner } from "@/lib/matching/dispatch";
import { emitToSocketServer } from "@/lib/socketServer";
import type { LngLat } from "@/lib/matching/geo";

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
    mobileNumber,
    vehicleType,
  } = body;

  if (!pickupLocation?.coordinates || !dropLocation?.coordinates) {
    return NextResponse.json(
      { message: "Missing required coordinates fields" },
      { status: 400 },
    );
  }

  const existing = await Booking.findOne({
    user: session.user.id,
    status: {
      $in: [
        "requested",
        "awaiting_payment",
        "confirmed",
        "arriving",
        "arrived",
        "started",
      ],
    },
  });

  if (existing) {
    return NextResponse.json({ success: true, booking: existing });
  }

  const resolvedVehicleType = vehicleType || "car";
  const pickupCoordinates = pickupLocation.coordinates as LngLat;

  let matchedDriverId = driverId;
  let matchedVehicleId = vehicleId;
  let matchedDriverMobile = "";
  let matchRadiusMeters = 5000;
  let matchRadiusTierIndex = 0;
  let matchedPartner = null as Awaited<
    ReturnType<typeof findPartnerWithRadiusExpansion>
  > | null;

  if (!matchedDriverId || !matchedVehicleId) {
    matchedPartner = await findPartnerWithRadiusExpansion({
      pickupCoordinates,
      vehicleType: resolvedVehicleType,
      excludePartnerIds: [],
    });

    if (!matchedPartner) {
      return NextResponse.json(
        {
          message: "No drivers available nearby",
          code: "NO_DRIVERS",
          searchedRadiusKm: [5, 7, 10, 15],
        },
        { status: 404 },
      );
    }

    matchedDriverId = matchedPartner.match.partnerId;
    matchedVehicleId = matchedPartner.match.vehicleId;
    matchedDriverMobile = matchedPartner.match.mobileNumber;
    matchRadiusMeters = matchedPartner.radiusMeters;
    matchRadiusTierIndex = matchedPartner.tierIndex;
  } else {
    const driver = await User.findById(matchedDriverId).select(
      "mobileNumber isOnline isPartnerAvailable partnerStatus",
    );

    if (!driver || driver.partnerStatus !== "approved") {
      return NextResponse.json(
        { message: "Selected driver is not available" },
        { status: 400 },
      );
    }

    if (!driver.isOnline || driver.isPartnerAvailable === false) {
      return NextResponse.json(
        { message: "Selected driver is offline" },
        { status: 400 },
      );
    }

    matchedDriverMobile = driver.mobileNumber || "";
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
    userMobileNumber: mobileNumber,
    driverMobileNumber: matchedDriverMobile,
    status: "requested",
    attemptedDrivers: [matchedDriverId],
    vehicleType: resolvedVehicleType,
    driverAssignedAt: new Date(),
    matchRadiusMeters,
    matchRadiusTierIndex,
  });

  let dispatch = null;

  if (matchedPartner) {
    dispatch = await dispatchBookingToPartner(
      booking,
      matchedPartner.match,
      matchedPartner.radiusMeters,
    );
  } else {
    await emitToSocketServer({
      userId: String(matchedDriverId),
      event: "new-booking",
      data: booking,
      bookingId: String(booking._id),
    });
  }

  await notifyAdminDashboard({ scope: "map", reason: "booking-created" });

  return NextResponse.json({
    success: true,
    booking,
    dispatch,
  });
}
