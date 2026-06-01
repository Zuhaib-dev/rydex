import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/db";
import {
  countEligiblePartners,
  findClosestEligiblePartner,
} from "@/lib/matching/findPartner";
import {
  MATCH_RADIUS_TIERS_METERS,
  radiusKm,
} from "@/lib/matching/config";
import Vehicle from "@/models/vehicle.model";
import type { LngLat } from "@/lib/matching/geo";
import { estimateRoadDistanceMeters } from "@/lib/matching/geo";

export async function POST(req: NextRequest) {
  try {
    await connectDb();

    const { latitude, longitude, vehicleType } = await req.json();

    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      Number.isNaN(latitude) ||
      Number.isNaN(longitude)
    ) {
      return NextResponse.json(
        { message: "Valid coordinates required" },
        { status: 400 },
      );
    }

    const pickupCoordinates: LngLat = [longitude, latitude];
    const resolvedType = vehicleType || "car";

    let radiusMeters: number = MATCH_RADIUS_TIERS_METERS[0];
    let nearbyCount = 0;

    for (const tier of MATCH_RADIUS_TIERS_METERS) {
      nearbyCount = await countEligiblePartners(
        pickupCoordinates,
        resolvedType,
        tier,
      );
      if (nearbyCount > 0) {
        radiusMeters = tier;
        break;
      }
    }

    if (!nearbyCount) {
      return NextResponse.json({
        success: true,
        vehicles: [],
        nearbyCount: 0,
        searchRadiusKm: radiusKm(MATCH_RADIUS_TIERS_METERS[MATCH_RADIUS_TIERS_METERS.length - 1]),
      });
    }

    const nearest = await findClosestEligiblePartner({
      pickupCoordinates,
      vehicleType: resolvedType,
      excludePartnerIds: [],
      radiusMeters,
      skipLock: true,
    });

    if (!nearest) {
      return NextResponse.json({
        success: true,
        vehicles: [],
        nearbyCount: 0,
        searchRadiusKm: radiusKm(radiusMeters),
      });
    }

    const vehicles = await Vehicle.find({
      owner: nearest.partnerId,
      status: "approved",
      isActive: true,
      type: resolvedType,
    })
      .populate(
        "owner",
        "name ratingAverage ratingCount praiseTags mobileNumber image location",
      )
      .lean();

    const enriched = vehicles.map((v) => {
      const owner = v.owner as {
        location?: { coordinates?: LngLat };
      };
      const ownerCoords = owner?.location?.coordinates;
      const distanceMeters = ownerCoords
        ? estimateRoadDistanceMeters(pickupCoordinates, ownerCoords)
        : nearest.roadDistanceMeters;

      return {
        ...v,
        distanceMeters,
        distanceKm: distanceMeters / 1000,
        etaMinutes: nearest.etaMinutes,
      };
    });

    enriched.sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));

    return NextResponse.json({
      success: true,
      vehicles: enriched,
      nearbyCount,
      searchRadiusKm: radiusKm(radiusMeters),
      recommendedPartnerId: nearest.partnerId,
    });
  } catch (error) {
    console.error("Nearby vehicles error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
