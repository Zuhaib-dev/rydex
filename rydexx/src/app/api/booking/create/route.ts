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
import {
  loadValidQuote,
  quoteToSnapshot,
} from "@/lib/createBookingQuote";
import { getRedisClient } from "@/lib/redis";

export async function POST(req: Request) {
  await connectDb();

  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { quoteId, mobileNumber, driverId: overrideDriverId } = body;

  if (!quoteId) {
    return NextResponse.json(
      { message: "quoteId is required — create a locked quote first" },
      { status: 400 },
    );
  }

  const quote = await loadValidQuote(quoteId, session.user.id);
  if (!quote) {
    return NextResponse.json(
      { message: "Quote expired or invalid. Please get a new fare." },
      { status: 400 },
    );
  }

  const snapshot = quoteToSnapshot(quote);

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

  const pickupCoordinates = snapshot.pickupLocation.coordinates as LngLat;

  let matchedDriverId: string | undefined =
    overrideDriverId || snapshot.driverId;
  let matchedVehicleId: string | undefined = snapshot.vehicleId;
  let matchedDriverMobile = "";
  let matchRadiusMeters = 5000;
  let matchRadiusTierIndex = 0;
  let matchedPartner = null as Awaited<
    ReturnType<typeof findPartnerWithRadiusExpansion>
  > | null;

  if (matchedDriverId) {
    const driver = await User.findById(matchedDriverId).select(
      "mobileNumber isOnline isPartnerAvailable partnerStatus",
    );

    let acquired: string | null = null;
    try {
      const redis = getRedisClient();
      const lockKey = `lock:driver:${matchedDriverId}`;
      acquired = await redis.set(lockKey, "locked", "EX", 25, "NX");

      if (
        driver &&
        driver.partnerStatus === "approved" &&
        driver.isOnline &&
        driver.isPartnerAvailable !== false &&
        acquired === "OK"
      ) {
        matchedDriverMobile = driver.mobileNumber || "";
      } else {
        if (acquired === "OK") {
          await redis.del(`lock:driver:${matchedDriverId}`);
        }
        matchedDriverId = undefined;
        matchedVehicleId = undefined;
      }
    } catch (err) {
      console.warn("[booking/create] Redis lock unavailable, proceeding without lock:", err);
      // If Redis is down, still proceed if driver looks valid in MongoDB
      if (
        driver &&
        driver.partnerStatus === "approved" &&
        driver.isOnline &&
        driver.isPartnerAvailable !== false
      ) {
        matchedDriverMobile = driver.mobileNumber || "";
      } else {
        matchedDriverId = undefined;
        matchedVehicleId = undefined;
      }
    }
  }

  if (!matchedDriverId) {
    matchedPartner = await findPartnerWithRadiusExpansion({
      pickupCoordinates,
      vehicleType: snapshot.vehicleType,
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
  }

  if (!matchedDriverId || !matchedVehicleId) {
    return NextResponse.json(
      { message: "No drivers available nearby", code: "NO_DRIVERS" },
      { status: 404 },
    );
  }
  if (mobileNumber) {
    await User.findByIdAndUpdate(session.user.id, {
      $set: { mobileNumber },
    });
  }

  const booking = await Booking.create({
    user: session.user.id,
    driver: matchedDriverId,
    vehicle: matchedVehicleId,
    pickupAddress: snapshot.pickupAddress,
    dropAddress: snapshot.dropAddress,
    pickupLocation: snapshot.pickupLocation,
    dropLocation: snapshot.dropLocation,
    fare: snapshot.fare,
    tripDistanceKm: snapshot.tripDistanceKm,
    durationMinutes: snapshot.durationMinutes,
    routePolyline: snapshot.routePolyline,
    pricingSnapshot: snapshot.pricingSnapshot,
    kashmirAdjusted: snapshot.kashmirAdjusted,
    quoteId: quote._id,
    userMobileNumber: mobileNumber,
    driverMobileNumber: matchedDriverMobile,
    status: "requested",
    attemptedDrivers: [matchedDriverId],
    vehicleType: snapshot.vehicleType,
    driverAssignedAt: new Date(),
    matchRadiusMeters,
    matchRadiusTierIndex,
    passengers: snapshot.passengers,
    notes: snapshot.notes,
    scheduledAt: snapshot.scheduledAt,
  });

  // Delete the cached quote from Redis now that the booking has been converted
  try {
    const redis = getRedisClient();
    await redis.del(`quote:${quoteId}`);
  } catch (err) {
    console.warn("[booking/create] Redis quote cleanup failed (non-critical):", err);
  }

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

  await notifyAdminDashboard({ scope: "all", reason: "booking-created" });

  return NextResponse.json({
    success: true,
    booking,
    dispatch,
  });
}
