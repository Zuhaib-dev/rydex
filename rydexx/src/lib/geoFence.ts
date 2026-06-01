/**
 * Kashmir-aware geo-fencing for Rydex.
 * Defines cash-only zones and restricted/blocked zones within the J&K operational region.
 * Results are cached in Redis for 1 hour to avoid repeated computation.
 */

import { getRedisClient } from "@/lib/redis";

export type GeoFenceResult = {
  allowed: boolean;
  cashOnly: boolean;
  reason?: string;
  zoneName?: string;
};

type Zone = {
  name: string;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  /** blocked = no bookings; cashOnly = bookings only with cash payment */
  type: "blocked" | "cashOnly";
  reason: string;
};

/**
 * Geo-fence zones within the J&K / Kashmir operational area.
 * Coordinates are approximate bounding boxes — update as needed.
 */
const GEO_FENCE_ZONES: Zone[] = [
  {
    name: "LOC Buffer Zone (North Kashmir)",
    minLat: 34.2,
    maxLat: 34.7,
    minLng: 73.8,
    maxLng: 74.5,
    type: "cashOnly",
    reason: "This route passes through an area near the Line of Control. Online payments are not available here. Please pay in cash.",
  },
  {
    name: "High-Altitude Gurez Valley",
    minLat: 34.6,
    maxLat: 34.85,
    minLng: 74.7,
    maxLng: 75.2,
    type: "blocked",
    reason: "Bookings in Gurez Valley are temporarily unavailable due to limited connectivity in the region.",
  },
  {
    name: "Drass High-Altitude Zone",
    minLat: 34.4,
    maxLat: 34.65,
    minLng: 75.6,
    maxLng: 76.0,
    type: "blocked",
    reason: "Bookings in the Drass sector are unavailable due to restricted access.",
  },
  {
    name: "Tangmarg / Gulmarg Tourist Zone",
    minLat: 34.0,
    maxLat: 34.2,
    minLng: 74.3,
    maxLng: 74.55,
    type: "cashOnly",
    reason: "Online payments are not supported in Gulmarg/Tangmarg due to connectivity limitations. Please pay in cash.",
  },
];

function checkZone(lat: number, lng: number): GeoFenceResult {
  for (const zone of GEO_FENCE_ZONES) {
    if (lat >= zone.minLat && lat <= zone.maxLat && lng >= zone.minLng && lng <= zone.maxLng) {
      if (zone.type === "blocked") {
        return { allowed: false, cashOnly: false, reason: zone.reason, zoneName: zone.name };
      }
      if (zone.type === "cashOnly") {
        return { allowed: true, cashOnly: true, reason: zone.reason, zoneName: zone.name };
      }
    }
  }
  return { allowed: true, cashOnly: false };
}

/**
 * Check if a coordinate is inside a geo-fenced zone.
 * Results are cached in Redis for 1 hour.
 */
export async function checkGeoFence(lat: number, lng: number): Promise<GeoFenceResult> {
  // Round to 2 decimal places (~1.1 km grid) for cache key granularity
  const cacheKey = `geofence:${lat.toFixed(2)}:${lng.toFixed(2)}`;

  try {
    const redis = getRedisClient();
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as GeoFenceResult;
    }
  } catch {
    // Redis unavailable — compute inline without caching
  }

  const result = checkZone(lat, lng);

  try {
    const redis = getRedisClient();
    await redis.set(cacheKey, JSON.stringify(result), "EX", 3600); // 1-hour TTL
  } catch {
    // Cache write failure is non-fatal
  }

  return result;
}

/**
 * Check both pickup and drop coordinates and return the combined geo-fence result.
 * If either is blocked, the booking is blocked. If either is cash-only, the whole booking is cash-only.
 */
export async function checkBookingGeoFence(
  pickupLat: number,
  pickupLng: number,
  dropLat: number,
  dropLng: number,
): Promise<GeoFenceResult & { pickupZone?: GeoFenceResult; dropZone?: GeoFenceResult }> {
  const [pickup, drop] = await Promise.all([
    checkGeoFence(pickupLat, pickupLng),
    checkGeoFence(dropLat, dropLng),
  ]);

  if (!pickup.allowed) {
    return { ...pickup, pickupZone: pickup, dropZone: drop };
  }
  if (!drop.allowed) {
    return { ...drop, pickupZone: pickup, dropZone: drop };
  }
  if (pickup.cashOnly || drop.cashOnly) {
    const cashZone = pickup.cashOnly ? pickup : drop;
    return {
      allowed: true,
      cashOnly: true,
      reason: cashZone.reason,
      zoneName: cashZone.zoneName,
      pickupZone: pickup,
      dropZone: drop,
    };
  }

  return { allowed: true, cashOnly: false, pickupZone: pickup, dropZone: drop };
}
