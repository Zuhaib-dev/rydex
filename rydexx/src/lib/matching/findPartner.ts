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

  try {
    const redis = getRedisClient();
    const pipeline = redis.pipeline();
    candidateIds.forEach((id) => pipeline.get(`driver:busy:${String(id)}`));
    const results = await pipeline.exec();

    if (results) {
      const busySet = new Set<string>();
      candidateIds.forEach((id, index) => {
        const [err, val] = results[index] as [Error | null, string | null];
        if (!err && val) {
          busySet.add(String(id));
        }
      });
      // If Redis succeeds, verify busy status against MongoDB to prevent ghost busy states
      if (busySet.size > 0) {
        const actualBusy = await Booking.distinct("driver", {
          driver: { $in: Array.from(busySet) },
          status: { $in: [...ACTIVE_DRIVER_STATUSES] },
        });
        const actualBusySet = new Set(actualBusy.map((id) => String(id)));

        // Clean up false positives in Redis asynchronously
        busySet.forEach((id) => {
          if (!actualBusySet.has(id)) {
            redis.del(`driver:busy:${id}`).catch(() => {});
          }
        });

        return actualBusySet;
      }

      return busySet;
    }
  } catch (err) {
    console.warn("[getBusyPartnerIds] Redis failed, falling back to MongoDB:", err);
  }

  // MongoDB fallback
  const busy = await Booking.distinct("driver", {
    driver: { $in: candidateIds },
    status: { $in: [...ACTIVE_DRIVER_STATUSES] },
  });

  return new Set(busy.map((id) => String(id)));
}

async function fetchVehiclesForPartners(
  partnerIds: mongoose.Types.ObjectId[],
  activeVehicleIds: unknown[],
  vehicleType: string
) {
  let vehicles: Array<{ _id: unknown; owner: unknown; type: string }> = [];

  if (!activeVehicleIds.length) return vehicles;

  try {
    const redis = getRedisClient();
    const pipeline = redis.pipeline();
    activeVehicleIds.forEach((id) => pipeline.get(`vehicle:cache:${String(id)}`));
    const results = await pipeline.exec();
    
    if (results) {
      const cachedVehicles = results
        .map((r) => r[1])
        .filter(Boolean)
        .map((str) => JSON.parse(str as string));
        
      const missingIds = activeVehicleIds.filter((id, i) => !results[i][1]);
      
      let dbVehicles: any[] = [];
      if (missingIds.length > 0) {
        dbVehicles = await Vehicle.find({
          _id: { $in: missingIds },
          owner: { $in: partnerIds },
          status: "approved",
          isActive: true,
          type: vehicleType,
        })
          .select("_id owner type baseFare perKmRate status isActive")
          .lean();
          
        const setPipeline = redis.pipeline();
        dbVehicles.forEach((v) => {
          setPipeline.set(`vehicle:cache:${String(v._id)}`, JSON.stringify(v), "EX", 3600);
        });
        await setPipeline.exec().catch(() => {});
      }
      
      vehicles = [...cachedVehicles, ...dbVehicles].filter((v) => String(v.type) === vehicleType);
    }
  } catch (err) {
    console.warn("[findPartner] Vehicle Redis cache failed, falling back to DB:", err);
    vehicles = await Vehicle.find({
      _id: { $in: activeVehicleIds },
      owner: { $in: partnerIds },
      status: "approved",
      isActive: true,
      type: vehicleType,
    })
      .select("_id owner type")
      .lean();
  }

  return vehicles;
}

type RedisGeoResult<T> = {
  success: boolean;
  data: T;
};

/**
 * Try to get nearby driver IDs from Redis GeoSet.
 * Returns success: true with the results (even if empty), or success: false on failure.
 */
async function getNearbyIdsFromRedis(
  pickupCoordinates: LngLat,
  radiusMeters: number,
  withDist: true
): Promise<RedisGeoResult<Map<string, number>>>;
async function getNearbyIdsFromRedis(
  pickupCoordinates: LngLat,
  radiusMeters: number,
  withDist: false
): Promise<RedisGeoResult<string[]>>;
async function getNearbyIdsFromRedis(
  pickupCoordinates: LngLat,
  radiusMeters: number,
  withDist: boolean
): Promise<RedisGeoResult<Map<string, number>> | RedisGeoResult<string[]>> {
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
      )) as Array<[string, string]> | null;

      const map = new Map<string, number>();
      if (results) {
        for (const [id, dist] of results) {
          map.set(id, parseFloat(dist));
        }
      }
      return { success: true, data: map };
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
      )) as string[] | null;

      return { success: true, data: results || [] };
    }
  } catch (err) {
    console.warn("[findPartner] Redis GeoSearch failed, will use MongoDB fallback:", err);
    if (withDist) {
      return { success: false, data: new Map<string, number>() } as RedisGeoResult<Map<string, number>>;
    } else {
      return { success: false, data: [] as string[] } as RedisGeoResult<string[]>;
    }
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

  if (redisResult.success) {
    // Redis fast-path succeeded
    driverGeoMap = redisResult.data;
    nearbyDriverIds = Array.from(driverGeoMap.keys());
  } else {
    // Redis unavailable — fall back to MongoDB
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
    .select("_id mobileNumber name location ratingAverage ratingCount updatedAt isPremiumPartner activeVehicleId")
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

  // --- Step 4: Check busy partners and fetch vehicles (in parallel) ---
  const partnerIds = sortedPartners.map((p) => p._id as mongoose.Types.ObjectId);
  const activeVehicleIds = sortedPartners
    .map((p) => p.activeVehicleId)
    .filter(Boolean);

  const [busyIds, vehicles] = await Promise.all([
    getBusyPartnerIds(partnerIds),
    fetchVehiclesForPartners(partnerIds, activeVehicleIds, vehicleType),
  ]);

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
  const redisResult = await getNearbyIdsFromRedis(pickupCoordinates, radiusMeters, false);

  let candidateIds: string[];

  if (redisResult.success) {
    candidateIds = redisResult.data;
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
    .select("_id activeVehicleId")
    .lean();

  if (!partners.length) return 0;

  const partnerIds = partners.map((p) => p._id as mongoose.Types.ObjectId);
  const busyIds = await getBusyPartnerIds(partnerIds);

  const activeVehicleIds = partners
    .map((p) => p.activeVehicleId)
    .filter(Boolean);

  const vehicles = await Vehicle.find({
    _id: { $in: activeVehicleIds },
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
