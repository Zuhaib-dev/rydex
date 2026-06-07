/**
 * Surge pricing checker.
 *
 * Queries active SurgeZones using MongoDB $geoIntersects on the pickup point.
 * Returns the highest active multiplier found, or 1.0 if no zone matches.
 * Results are cached in Redis for 30 seconds per rounded coordinate.
 */
import connectDb from "@/lib/db";
import SurgeZone from "@/models/surgeZone.model";
import { getRedisClient } from "@/lib/redis";

const CACHE_TTL = 30; // seconds

export async function getSurgeMultiplier(
  lat: number,
  lng: number
): Promise<number> {
  // Round to 3 decimal places (~111m grid) for cache key
  const cacheKey = `surge:${lat.toFixed(3)}:${lng.toFixed(3)}`;

  // 1. Check Redis cache first
  try {
    const redis = getRedisClient();
    const cached = await redis.get(cacheKey);
    if (cached !== null) {
      return parseFloat(cached);
    }
  } catch {
    // Redis unavailable — fall through to DB
  }

  // 2. Query MongoDB for active surge zones containing this point
  await connectDb();

  let multiplier = 1.0;

  try {
    const matchingZones = await SurgeZone.find({
      isActive: true,
      area: {
        $geoIntersects: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat], // GeoJSON: [lng, lat]
          },
        },
      },
    })
      .select("multiplier")
      .lean();

    if (matchingZones.length > 0) {
      // Use the highest multiplier if multiple zones overlap
      multiplier = Math.max(...matchingZones.map((z) => z.multiplier));
    }
  } catch (err) {
    console.warn("[surgeCheck] DB query failed, defaulting to 1.0:", err);
    return 1.0;
  }

  // 3. Cache the result
  try {
    const redis = getRedisClient();
    await redis.set(cacheKey, String(multiplier), "EX", CACHE_TTL);
  } catch {
    // Non-fatal
  }

  return multiplier;
}
