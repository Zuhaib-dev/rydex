import connectDb from "./db";
import Booking from "@/models/booking.model";
import mongoose from "mongoose";
import {
  getRadiusTier,
  nextRadiusTierIndex,
  radiusKm,
} from "./matching/config";
import { findClosestEligiblePartner } from "./matching/findPartner";
import { dispatchBookingToPartner } from "./matching/dispatch";
import { emitBookingUpdated } from "./bookingEvents";
import { getRedisClient } from "@/lib/redis";

export async function cascadeBooking(bookingId: string, currentDriverId: string) {
  await connectDb();

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    console.error(`Booking not found: ${bookingId}`);
    return { success: false, message: "Booking not found" };
  }

  if (
    booking.status !== "requested" ||
    String(booking.driver) !== String(currentDriverId)
  ) {
    return { success: false, message: "Booking is already processed or driver changed" };
  }

  const oldDriverId = String(booking.driver);
  
  // Release old driver's lock
  const redis = getRedisClient();
  await redis.del(`lock:driver:${oldDriverId}`);

  const pickupCoordinates = booking.pickupLocation.coordinates as [
    number,
    number,
  ];

  const attempted = booking.attemptedDrivers.map((id: unknown) => String(id));
  if (!attempted.includes(String(currentDriverId))) {
    booking.attemptedDrivers.push(
      new mongoose.Types.ObjectId(currentDriverId),
    );
  }

  let tierIndex = booking.matchRadiusTierIndex ?? 0;
  let radiusMeters =
    booking.matchRadiusMeters ?? getRadiusTier(tierIndex);

  const excludeIds = booking.attemptedDrivers.map((id: unknown) => String(id));

  let match = await findClosestEligiblePartner({
    pickupCoordinates,
    vehicleType: booking.vehicleType,
    excludePartnerIds: excludeIds,
    radiusMeters,
  });

  // Expand search radius when no more riders in current tier
  while (!match) {
    const nextTier = nextRadiusTierIndex(tierIndex);
    if (nextTier === null) break;

    tierIndex = nextTier;
    radiusMeters = getRadiusTier(tierIndex);
    booking.matchRadiusTierIndex = tierIndex;
    booking.matchRadiusMeters = radiusMeters;
    await booking.save();

    await emitBookingUpdated(booking, {
      bookingId: String(booking._id),
      status: "requested",
      matchRadiusMeters: radiusMeters,
      matchRadiusKm: radiusKm(radiusMeters),
      searchingMessage: `Expanding search to ${radiusKm(radiusMeters)} km…`,
    });

    match = await findClosestEligiblePartner({
      pickupCoordinates,
      vehicleType: booking.vehicleType,
      excludePartnerIds: excludeIds,
      radiusMeters,
    });
  }

  if (match) {
    booking.driver = new mongoose.Types.ObjectId(match.partnerId);
    booking.vehicle = new mongoose.Types.ObjectId(match.vehicleId);
    booking.driverMobileNumber = match.mobileNumber;
    booking.driverAssignedAt = new Date();
    booking.matchRadiusMeters = radiusMeters;
    booking.matchRadiusTierIndex = tierIndex;
    booking.attemptedDrivers.push(
      new mongoose.Types.ObjectId(match.partnerId),
    );
    booking.status = "requested";
    await booking.save();

    await dispatchBookingToPartner(booking, match, radiusMeters, {
      previousDriverId: oldDriverId,
    });

    return {
      success: true,
      cascaded: true,
      nextDriverId: match.partnerId,
      radiusMeters,
    };
  }

  booking.status = "rejected";
  await booking.save();

  await emitBookingUpdated(booking, {
    bookingId: String(booking._id),
    status: "rejected",
    searchingMessage: "No drivers available in your area",
  });

  const { emitToSocketServer } = await import("./socketServer");
  await emitToSocketServer({
    userId: oldDriverId,
    event: "booking-updated",
    data: {
      bookingId: String(booking._id),
      status: "expired",
    },
  });

  return { success: true, cascaded: false, message: "No drivers available" };
}
