import mongoose from "mongoose";
import connectDb from "@/lib/db";
import Vehicle from "@/models/vehicle.model";
import BookingQuote from "@/models/bookingQuote.model";
import { fetchDrivingRoute } from "@/lib/mapboxRouting";
import { getRedisClient } from "@/lib/redis";
import { calculateTripFare } from "@/lib/fare";
import {
  PRICING_VERSION,
  routeToLineString,
  type BookingSnapshot,
} from "@/lib/bookingSnapshot";
import type { LngLat } from "@/lib/matching/geo";
import { tripDistanceKmFromCoords } from "@/lib/fare";

const QUOTE_TTL_MS = 30 * 60 * 1000;

type CreateQuoteInput = {
  userId: string;
  pickupAddress: string;
  dropAddress: string;
  pickupLng: number;
  pickupLat: number;
  dropLng: number;
  dropLat: number;
  vehicleId: string;
  driverId?: string;
  passengers?: number;
  notes?: string;
  scheduledAt?: Date | string;
};

export async function createLockedBookingQuote(input: CreateQuoteInput) {
  await connectDb();

  const pickupCoordinates: LngLat = [input.pickupLng, input.pickupLat];
  const dropCoordinates: LngLat = [input.dropLng, input.dropLat];

  const vehicle = await Vehicle.findById(input.vehicleId).select(
    "baseFare perKmRate type status isActive owner",
  );

  if (!vehicle || vehicle.status !== "approved" || !vehicle.isActive) {
    return { success: false as const, message: "Vehicle not available" };
  }

  const route = await fetchDrivingRoute([
    [input.pickupLat, input.pickupLng],
    [input.dropLat, input.dropLng],
  ]);

  const tripDistanceKm = route
    ? Math.round(route.distanceKm * 100) / 100
    : tripDistanceKmFromCoords(pickupCoordinates, dropCoordinates);

  const durationMinutes = route?.durationMinutes ?? Math.max(
    3,
    Math.round((tripDistanceKm / 25) * 60),
  );

  const fare = calculateTripFare(vehicle, tripDistanceKm);

  const pricingSnapshot = {
    baseFare: Number(vehicle.baseFare) || 0,
    perKmRate: Number(vehicle.perKmRate) || 0,
    vehicleType: String(vehicle.type),
    vehicleId: String(vehicle._id),
    pricingVersion: PRICING_VERSION,
  };

  const snapshot: BookingSnapshot = {
    pickupAddress: input.pickupAddress,
    dropAddress: input.dropAddress,
    pickupLocation: { type: "Point", coordinates: pickupCoordinates },
    dropLocation: { type: "Point", coordinates: dropCoordinates },
    tripDistanceKm,
    durationMinutes,
    fare,
    vehicleType: String(vehicle.type),
    vehicleId: String(vehicle._id),
    driverId: input.driverId,
    routePolyline: routeToLineString(route, pickupCoordinates, dropCoordinates),
    pricingSnapshot,
    kashmirAdjusted: route?.kashmirAdjusted,
    passengers: input.passengers,
    notes: input.notes,
    scheduledAt: input.scheduledAt,
  };

  // Generate a valid MongoDB ObjectId on the client-side
  const quoteId = new mongoose.Types.ObjectId().toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10-minute expiration

  const quoteData = {
    _id: quoteId,
    user: input.userId,
    ...snapshot,
    driverId: input.driverId,
    expiresAt: expiresAt.toISOString(),
  };

  // Cache in Redis for 10 minutes (600 seconds)
  const redis = getRedisClient();
  await redis.set(`quote:${quoteId}`, JSON.stringify(quoteData), "EX", 600);

  return {
    success: true as const,
    quoteId,
    snapshot,
    expiresAt,
  };
}

export async function loadValidQuote(quoteId: string, userId: string) {
  const redis = getRedisClient();
  const data = await redis.get(`quote:${quoteId}`);
  if (!data) return null;

  try {
    const quote = JSON.parse(data);
    if (String(quote.user) !== String(userId)) return null;
    if (quote.usedAt) return null;
    if (new Date(quote.expiresAt) < new Date()) return null;
    return quote;
  } catch (error) {
    console.error("Failed to parse quote from Redis:", error);
    return null;
  }
}

export function quoteToSnapshot(quote: {
  pickupAddress: string;
  dropAddress: string;
  pickupLocation: { type: "Point"; coordinates: [number, number] };
  dropLocation: { type: "Point"; coordinates: [number, number] };
  tripDistanceKm: number;
  durationMinutes: number;
  fare: number;
  vehicleType: string;
  vehicleId: unknown;
  driverId?: unknown;
  routePolyline: GeoJSON.LineString;
  pricingSnapshot: BookingSnapshot["pricingSnapshot"];
  kashmirAdjusted?: boolean;
  passengers?: number;
  notes?: string;
  scheduledAt?: Date;
}): BookingSnapshot {
  return {
    pickupAddress: quote.pickupAddress,
    dropAddress: quote.dropAddress,
    pickupLocation: quote.pickupLocation,
    dropLocation: quote.dropLocation,
    tripDistanceKm: quote.tripDistanceKm,
    durationMinutes: quote.durationMinutes,
    fare: quote.fare,
    vehicleType: quote.vehicleType,
    vehicleId: String(quote.vehicleId),
    driverId: quote.driverId ? String(quote.driverId) : undefined,
    routePolyline: quote.routePolyline,
    pricingSnapshot: quote.pricingSnapshot,
    kashmirAdjusted: quote.kashmirAdjusted,
    passengers: quote.passengers,
    notes: quote.notes,
    scheduledAt: quote.scheduledAt ? new Date(quote.scheduledAt) : undefined,
  };
}
