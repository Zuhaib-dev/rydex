import mongoose from "mongoose";
import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";
import Booking from "@/models/booking.model";
import { getRedisClient } from "@/lib/redis";
import {
  MATCH_LOCATION_MAX_AGE_MS,
  MATCH_RADIUS_TIERS_METERS,
  getRadiusTier,
} from "./config";
import {
  estimatePickupEtaMinutes,
  estimateRoadDistanceMeters,
  type LngLat,
} from "./geo";

const ACTIVE_DRIVER_STATUSES = [
  "awaiting_payment",
  "confirmed",
  "arriving",
  "arrived",
  "started",
] as const;

export type MatchedPartner = {
  partnerId: string;
  vehicleId: string;
  mobileNumber: string;
  name?: string;
  ratingAverage?: number;
  distanceMeters: number;
  roadDistanceMeters: number;
  etaMinutes: number;
  vehicleType: string;
};

type FindOptions = {
  pickupCoordinates: LngLat;
  vehicleType: string;
  excludePartnerIds?: string[];
  radiusMeters: number;
  /** When true, walks all radius tiers until a match or exhaustion */
  expandRadius?: boolean;
  /** When true, skips distributed locking (for read-only preview searches) */
  skipLock?: boolean;
};

async function getBusyPartnerIds(candidateIds: mongoose.Types.ObjectId[]) {
  if (!candidateIds.length) return new Set<string>();

  const busy = await Booking.distinct("driver", {
    driver: { $in: candidateIds },
    status: { $in: [...ACTIVE_DRIVER_STATUSES] },
  });

  return new Set(busy.map((id) => String(id)));
}

/**
 * Try to get nearby driver IDs from Redis GeoSet.
 * Returns null if Redis is unavailable or GeoSet is empty —
 * callers should fall back to MongoDB $near.
 */
async function getNearbyIdsFromRedis(
  pickupCoordinates: LngLat,
  radiusMeters: number,
  withDist: true
): Promise<Map<string, number> | null>;
async function getNearbyIdsFromRedis(
  pickupCoordinates: LngLat,
  radiusMeters: number,
  withDist: false
): Promise<string[] | null>;
async function getNearbyIdsFromRedis(
  pickupCoordinates: LngLat,
  radiusMeters: number,
  withDist: boolean
): Promise<Map<string, number> | string[] | null> {
  try {
    const redis = getRedisClient();

    if (withDist) {
      const results = (await redis.geosearch(
        "driver:locations:active",
        "FROMLONLAT",
        pickupCoordinates[0],
        pickupCoordinates[1],
        "BYRADIUS",
        radiusMeters,
        "m",
        "ASC",
        "WITHDIST"
      )) as Array<[string, string]>;

      if (!results || results.length === 0) return null;

      const map = new Map<string, number>();
      for (const [id, dist] of results) {
        map.set(id, parseFloat(dist));
      }
      return map;
    } else {
      const results = (await redis.geosearch(
        "driver:locations:active",
        "FROMLONLAT",
        pickupCoordinates[0],
        pickupCoordinates[1],
        "BYRADIUS",
        radiusMeters,
        "m",
        "ASC"
      )) as string[];

      if (!results || results.length === 0) return null;
      return results;
    }
  } catch (err) {
    console.warn("[findPartner] Redis GeoSearch failed, will use MongoDB fallback:", err);
    return null;
  }
}

/**
 * MongoDB $near fallback — returns candidate IDs sorted by proximity.
 * Used when Redis is unavailable or GeoSet is empty.
 */
async function getNearbyIdsFromMongo(
  pickupCoordinates: LngLat,
  radiusMeters: number,
  excludePartnerIds: string[],
): Promise<string[]> {
  const locationCutoff = new Date(Date.now() - MATCH_LOCATION_MAX_AGE_MS);
  const excludeObjectIds = excludePartnerIds
    .filter(Boolean)
    .map((id) => new mongoose.Types.ObjectId(id));

  const partners = await User.find({
    role: "partner",
    isOnline: true,
    isPartnerAvailable: { $ne: false },
    partnerStatus: "approved",
    isPartnerBlocked: { $ne: true },
    ...(excludeObjectIds.length ? { _id: { $nin: excludeObjectIds } } : {}),
    $or: [
      { lastLocationAt: { $gte: locationCutoff } },
      {
        lastLocationAt: { $exists: false },
        updatedAt: { $gte: locationCutoff },
        "location.coordinates.0": { $exists: true },
      },
    ],
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: pickupCoordinates,
        },
        $maxDistance: radiusMeters,
      },
    },
  })
    .select("_id")
    .lean();

  return partners.map((p) => String(p._id));
}

/**
 * Finds the closest eligible partner+vehicle for a pickup point.
 * Tries Redis GeoSet first for sub-millisecond lookup, falls back to MongoDB $near.
 */
export async function findClosestEligiblePartner(
  options: FindOptions,
): Promise<MatchedPartner | null> {
  const {
    pickupCoordinates,
    vehicleType,
    excludePartnerIds = [],
    radiusMeters,
  } = options;

  // --- Step 1: Get nearby candidate IDs (Redis first, MongoDB fallback) ---
  let nearbyDriverIds: string[];
  let driverGeoMap = new Map<string, number>();

  const redisResult = await getNearbyIdsFromRedis(pickupCoordinates, radiusMeters, true);

  if (redisResult !== null) {
    // Redis fast-path succeeded
    driverGeoMap = redisResult;
    nearbyDriverIds = Array.from(redisResult.keys());
  } else {
    // Redis unavailable or empty — fall back to MongoDB
    console.log("[findPartner] Using MongoDB $near fallback for candidate lookup");
    nearbyDriverIds = await getNearbyIdsFromMongo(pickupCoordinates, radiusMeters, excludePartnerIds);
  }

  if (nearbyDriverIds.length === 0) return null;

  // --- Step 2: Filter out excluded partners ---
  const excludeStrIds = new Set(excludePartnerIds.map((id) => String(id)));
  const candidateIds = nearbyDriverIds.filter((id) => !excludeStrIds.has(id));
  if (candidateIds.length === 0) return null;

  // --- Step 3: Fetch partner details from MongoDB ---
  const candidateObjectIds = candidateIds.map((id) => new mongoose.Types.ObjectId(id));
  const locationCutoff = new Date(Date.now() - MATCH_LOCATION_MAX_AGE_MS);

  const partners = await User.find({
    _id: { $in: candidateObjectIds },
    role: "partner",
    isOnline: true,
    isPartnerAvailable: { $ne: false },
    partnerStatus: "approved",
    isPartnerBlocked: { $ne: true },
    $or: [
      { lastLocationAt: { $gte: locationCutoff } },
      {
        lastLocationAt: { $exists: false },
        updatedAt: { $gte: locationCutoff },
        "location.coordinates.0": { $exists: true },
      },
    ],
  })
    .select("_id mobileNumber name location ratingAverage ratingCount updatedAt isPremiumPartner")
    .lean();

  if (!partners.length) return null;

  const partnerMap = new Map<string, typeof partners[0]>();
  for (const p of partners) {
    partnerMap.set(String(p._id), p);
  }

  // Fair-share priority scoring:
  //   score = distanceKm - (idleHours * 0.15) - (rating * 0.5) - (premium ? 5.0 : 0)
  //   Lower score = higher priority (closer + idler + higher-rated + premium wins)
  const nowMs = Date.now();
  const scored = candidateIds
    .map((id) => {
      const partner = partnerMap.get(id);
      if (!partner) return null;
      const distanceKm = (driverGeoMap.get(id) ?? 5000) / 1000;
      const idleHours = (nowMs - new Date(partner.updatedAt as Date).getTime()) / 3_600_000;
      const rating = partner.ratingAverage ?? 0;
      // Premium partners get a massive priority boost equivalent to being 5km closer!
      const premiumBoost = partner.isPremiumPartner ? 5.0 : 0;
      const score = distanceKm - (idleHours * 0.15) - (rating * 0.5) - premiumBoost;
      return { partner, score };
    })
    .filter(Boolean) as { partner: typeof partners[0]; score: number }[];

  scored.sort((a, b) => a.score - b.score);
  const sortedPartners = scored.map((s) => s.partner);

  // --- Step 4: Check busy partners and fetch vehicles ---
  const partnerIds = sortedPartners.map((p) => p._id as mongoose.Types.ObjectId);
  const busyIds = await getBusyPartnerIds(partnerIds);

  const vehicles = await Vehicle.find({
    owner: { $in: partnerIds },
    status: "approved",
    isActive: true,
    type: vehicleType,
  })
    .select("_id owner type")
    .lean();

  const vehicleByOwner = new Map<string, (typeof vehicles)[0]>();
  for (const v of vehicles) {
    vehicleByOwner.set(String(v.owner), v);
  }

  // --- Step 5: Pick first available, non-busy partner with a vehicle and optional lock ---
  for (const partner of sortedPartners) {
    const pid = String(partner._id);
    if (busyIds.has(pid)) continue;

    const vehicle = vehicleByOwner.get(pid);
    if (!vehicle) continue;

    const coords = partner.location?.coordinates as LngLat | undefined;
    if (!coords?.length) continue;

    const straightMeters =
      driverGeoMap.get(pid) ?? estimateRoadDistanceMeters(pickupCoordinates, coords);
    const roadMeters = straightMeters;

    // --- Distributed Lock (Redlock) — skip for preview searches ---
    if (!options.skipLock) {
      try {
        const redis = getRedisClient();
        const lockKey = `lock:driver:${pid}`;
        const acquired = await redis.set(lockKey, "locked", "EX", 45, "NX");
        if (acquired !== "OK") {
          console.log(`[Redlock] Driver ${pid} is locked by another dispatch. Skipping...`);
          continue;
        }
      } catch (err) {
        console.warn("[findPartner] Redis lock failed, proceeding without lock:", err);
        // Don't block matching if Redis lock is unavailable — continue without it
      }
    }

    return {
      partnerId: pid,
      vehicleId: String(vehicle._id),
      mobileNumber: partner.mobileNumber || "",
      name: partner.name,
      ratingAverage: partner.ratingAverage,
      distanceMeters: straightMeters,
      roadDistanceMeters: roadMeters,
      etaMinutes: estimatePickupEtaMinutes(roadMeters, vehicleType),
      vehicleType,
    };
  }

  return null;
}

/** Try each radius tier until a partner is found */
export async function findPartnerWithRadiusExpansion(
  options: Omit<FindOptions, "radiusMeters" | "expandRadius"> & {
    startTierIndex?: number;
  },
): Promise<{ match: MatchedPartner; radiusMeters: number; tierIndex: number } | null> {
  const start = options.startTierIndex ?? 0;

  for (let tierIndex = start; tierIndex < MATCH_RADIUS_TIERS_METERS.length; tierIndex++) {
    const radiusMeters = getRadiusTier(tierIndex);
    const match = await findClosestEligiblePartner({
      ...options,
      radiusMeters,
    });

    if (match) {
      return { match, radiusMeters, tierIndex };
    }
  }

  return null;
}

/** Count eligible partners at a radius (for UI preview) */
export async function countEligiblePartners(
  pickupCoordinates: LngLat,
  vehicleType: string,
  radiusMeters: number,
): Promise<number> {
  // Try Redis first
  const redisIds = await getNearbyIdsFromRedis(pickupCoordinates, radiusMeters, false);

  let candidateIds: string[];

  if (redisIds !== null) {
    candidateIds = redisIds as string[];
  } else {
    // Redis unavailable — fall back to MongoDB $near
    console.log("[countEligiblePartners] Using MongoDB $near fallback");
    candidateIds = await getNearbyIdsFromMongo(pickupCoordinates, radiusMeters, []);
  }

  if (candidateIds.length === 0) return 0;

  const candidateObjectIds = candidateIds.map((id) => new mongoose.Types.ObjectId(id));
  const locationCutoff = new Date(Date.now() - MATCH_LOCATION_MAX_AGE_MS);

  const partners = await User.find({
    _id: { $in: candidateObjectIds },
    role: "partner",
    isOnline: true,
    isPartnerAvailable: { $ne: false },
    partnerStatus: "approved",
    isPartnerBlocked: { $ne: true },
    $or: [
      { lastLocationAt: { $gte: locationCutoff } },
      {
        lastLocationAt: { $exists: false },
        updatedAt: { $gte: locationCutoff },
        "location.coordinates.0": { $exists: true },
      },
    ],
  })
    .select("_id")
    .lean();

  if (!partners.length) return 0;

  const partnerIds = partners.map((p) => p._id as mongoose.Types.ObjectId);
  const busyIds = await getBusyPartnerIds(partnerIds);

  const vehicles = await Vehicle.find({
    owner: { $in: partnerIds },
    status: "approved",
    isActive: true,
    type: vehicleType,
  })
    .select("owner")
    .lean();

  const ownersWithVehicle = new Set(vehicles.map((v) => String(v.owner)));

  return partners.filter(
    (p) => !busyIds.has(String(p._id)) && ownersWithVehicle.has(String(p._id)),
  ).length;
}
