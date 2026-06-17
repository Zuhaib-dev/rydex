import mongoose from "mongoose";
import connectDb from "@/lib/db";
import Vehicle from "@/models/vehicle.model";
import BookingQuote from "@/models/bookingQuote.model";
import Coupon from "@/models/coupon.model";
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
import { getSurgeMultiplier } from "@/lib/surgeCheck";

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
  promoCode?: string;
};

const DISTANCE_LIMITS: Record<string, { minKm: number; maxKm: number; label: string }> = {
  bike: { minKm: 0.1, maxKm: 100, label: "Motorcycle" },
  auto: { minKm: 0.1, maxKm: 60, label: "Auto Rickshaw" },
  car: { minKm: 0.5, maxKm: 200, label: "Cab" },
  loading: { minKm: 1.0, maxKm: 500, label: "Loading Vehicle" },
  truck: { minKm: 5.0, maxKm: 3000, label: "Commercial Truck" },
};

export async function createLockedBookingQuote(input: CreateQuoteInput) {
  await connectDb();

  const pickupCoordinates: LngLat = [input.pickupLng, input.pickupLat];
  const dropCoordinates: LngLat = [input.dropLng, input.dropLat];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 800);

  // ── Parallelize independent external/DB calls to reduce latency ──
  const [vehicle, route, surgeMultiplier] = await Promise.all([
    Vehicle.findById(input.vehicleId)
      .select("baseFare perKmRate type status isActive owner")
      .lean(),
    fetchDrivingRoute(
      [pickupCoordinates, dropCoordinates],
      { signal: controller.signal }
    ).catch(() => null),
    getSurgeMultiplier(input.pickupLat, input.pickupLng),
  ]);

  clearTimeout(timeoutId);

  if (!vehicle || vehicle.status !== "approved" || !vehicle.isActive) {
    return { success: false as const, message: "Vehicle not available" };
  }

  const tripDistanceKm = route
    ? Math.round(route.distanceKm * 100) / 100
    : tripDistanceKmFromCoords(pickupCoordinates, dropCoordinates);

  const limits = DISTANCE_LIMITS[vehicle.type] || { minKm: 0.1, maxKm: 200, label: "Vehicle" };

  if (tripDistanceKm < limits.minKm) {
    const minMeters = limits.minKm * 1000;
    return {
      success: false as const,
      message: `The trip distance is too short for a ${limits.label}. Minimum allowed is ${minMeters} meters.`,
    };
  }

  if (tripDistanceKm > limits.maxKm) {
    return {
      success: false as const,
      message: `The trip distance is too long for a ${limits.label}. Maximum allowed is ${limits.maxKm} km.`,
    };
  }

  const durationMinutes = route?.durationMinutes ?? Math.max(
    3,
    Math.round((tripDistanceKm / 25) * 60),
  );

  const baseFareValue = calculateTripFare(vehicle, tripDistanceKm);

  // Surge multiplier is already fetched in parallel above
  const surgedFareValue = surgeMultiplier > 1
    ? Math.round(baseFareValue * surgeMultiplier)
    : baseFareValue;

  let fare = surgedFareValue;
  let discount = 0;
  let appliedPromo: string | undefined = undefined;

  if (input.promoCode) {
    const normalizedCode = input.promoCode.trim().toUpperCase();
    const coupon = await Coupon.findOne({ code: normalizedCode }).lean();
    if (coupon && coupon.isActive && new Date(coupon.expiryDate) >= new Date()) {
      const hasUsed = coupon.usedByUsers.some(
        (id: any) => id.toString() === input.userId
      );
      const underLimit = coupon.usageLimit === undefined || coupon.usedCount < coupon.usageLimit;
      const minAmountMet = !coupon.minBookingAmount || surgedFareValue >= coupon.minBookingAmount;

      if (!hasUsed && underLimit && minAmountMet) {
        appliedPromo = coupon.code;
        if (coupon.discountType === "flat") {
          discount = coupon.discountValue;
        } else if (coupon.discountType === "percentage") {
          discount = (surgedFareValue * coupon.discountValue) / 100;
          if (coupon.maxDiscount && discount > coupon.maxDiscount) {
            discount = coupon.maxDiscount;
          }
        }
        if (discount > surgedFareValue) {
          discount = surgedFareValue;
        }
        fare = surgedFareValue - discount;
        fare = Math.round(fare * 100) / 100;
        discount = Math.round(discount * 100) / 100;
      }
    }
  }

  const pricingSnapshot = {
    baseFare: Number(vehicle.baseFare) || 0,
    perKmRate: Number(vehicle.perKmRate) || 0,
    vehicleType: String(vehicle.type),
    vehicleId: String(vehicle._id),
    pricingVersion: PRICING_VERSION,
    surgeMultiplier,
  };

  const snapshot: BookingSnapshot = {
    pickupAddress: input.pickupAddress,
    dropAddress: input.dropAddress,
    pickupLocation: { type: "Point", coordinates: pickupCoordinates },
    dropLocation: { type: "Point", coordinates: dropCoordinates },
    tripDistanceKm,
    durationMinutes,
    fare,
    originalFare: baseFareValue,
    promoCode: appliedPromo,
    discount,
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

  const quoteId = new mongoose.Types.ObjectId().toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10-minute expiration

  // Try Redis first — fall back to MongoDB if Redis is unavailable
  let storedInRedis = false;
  try {
    const redis = getRedisClient();
    const quoteData = {
      _id: quoteId,
      user: input.userId,
      ...snapshot,
      driverId: input.driverId,
      expiresAt: expiresAt.toISOString(),
    };
    await redis.set(`quote:${quoteId}`, JSON.stringify(quoteData), "EX", 600);
    storedInRedis = true;
  } catch (err) {
    console.warn("[createLockedBookingQuote] Redis unavailable, falling back to MongoDB:", err);
  }

  // MongoDB fallback — always write when Redis failed
  if (!storedInRedis) {
    await BookingQuote.create({
      _id: quoteId,
      user: input.userId,
      ...snapshot,
      vehicleId: new mongoose.Types.ObjectId(String(snapshot.vehicleId)),
      driverId: input.driverId ? new mongoose.Types.ObjectId(input.driverId) : undefined,
      expiresAt,
    });
  }

  return {
    success: true as const,
    quoteId,
    snapshot,
    expiresAt,
  };
}

export async function loadValidQuote(quoteId: string, userId: string) {
  // 1. Try Redis first
  try {
    const redis = getRedisClient();
    const data = await redis.get(`quote:${quoteId}`);
    if (data) {
      const quote = JSON.parse(data);
      if (String(quote.user) !== String(userId)) return null;
      if (quote.usedAt) return null;
      if (new Date(quote.expiresAt) < new Date()) return null;
      return quote;
    }
  } catch (err) {
    console.warn("[loadValidQuote] Redis unavailable, falling back to MongoDB:", err);
  }

  // 2. MongoDB fallback
  try {
    const doc = await BookingQuote.findOne({
      _id: quoteId,
      user: userId,
      expiresAt: { $gt: new Date() },
      usedAt: { $exists: false },
    }).lean();
    return doc || null;
  } catch (err) {
    console.error("[loadValidQuote] MongoDB fallback also failed:", err);
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
  originalFare?: number;
  promoCode?: string;
  discount?: number;
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
    originalFare: quote.originalFare,
    promoCode: quote.promoCode,
    discount: quote.discount,
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
