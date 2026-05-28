import mongoose from "mongoose";
import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";
import Booking from "@/models/booking.model";
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
};

function toObjectIds(ids: string[]) {
  return ids
    .filter(Boolean)
    .map((id) => new mongoose.Types.ObjectId(id));
}

async function getBusyPartnerIds(candidateIds: mongoose.Types.ObjectId[]) {
  if (!candidateIds.length) return new Set<string>();

  const busy = await Booking.distinct("driver", {
    driver: { $in: candidateIds },
    status: { $in: [...ACTIVE_DRIVER_STATUSES] },
  });

  return new Set(busy.map((id) => String(id)));
}

/**
 * Finds the closest eligible partner+vehicle for a pickup point.
 * Uses MongoDB $near for geo index efficiency, then filters in-memory.
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

  const locationCutoff = new Date(Date.now() - MATCH_LOCATION_MAX_AGE_MS);
  const excludeObjectIds = toObjectIds(excludePartnerIds);

  const partners = await User.find({
    role: "partner",
    isOnline: true,
    isPartnerAvailable: { $ne: false },
    partnerStatus: "approved",
    isPartnerBlocked: { $ne: true },
    _id: { $nin: excludeObjectIds },
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
    .select("_id mobileNumber name location ratingAverage ratingCount")
    .lean();

  if (!partners.length) return null;

  const partnerIds = partners.map((p) => p._id as mongoose.Types.ObjectId);
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

  for (const partner of partners) {
    const pid = String(partner._id);
    if (busyIds.has(pid)) continue;

    const vehicle = vehicleByOwner.get(pid);
    if (!vehicle) continue;

    const coords = partner.location?.coordinates as LngLat | undefined;
    if (!coords?.length) continue;

    const straightMeters = estimateRoadDistanceMeters(
      pickupCoordinates,
      coords,
    );
    const roadMeters = straightMeters;

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
  const locationCutoff = new Date(Date.now() - MATCH_LOCATION_MAX_AGE_MS);

  const partners = await User.find({
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
    location: {
      $near: {
        $geometry: { type: "Point", coordinates: pickupCoordinates },
        $maxDistance: radiusMeters,
      },
    },
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
    (p) =>
      !busyIds.has(String(p._id)) && ownersWithVehicle.has(String(p._id)),
  ).length;
}
