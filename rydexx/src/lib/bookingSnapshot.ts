import type { RouteResult } from "@/lib/mapboxRouting";
import type { LngLat } from "@/lib/matching/geo";

export const PRICING_VERSION = "v1" as const;

export type PricingSnapshot = {
  baseFare: number;
  perKmRate: number;
  vehicleType: string;
  vehicleId: string;
  pricingVersion: typeof PRICING_VERSION;
};

/** Immutable trip + price data — single source of truth after quote is created */
export type BookingSnapshot = {
  pickupAddress: string;
  dropAddress: string;
  pickupLocation: { type: "Point"; coordinates: LngLat };
  dropLocation: { type: "Point"; coordinates: LngLat };
  tripDistanceKm: number;
  durationMinutes: number;
  fare: number;
  vehicleType: string;
  vehicleId: string;
  driverId?: string;
  routePolyline: GeoJSON.LineString;
  pricingSnapshot: PricingSnapshot;
  kashmirAdjusted?: boolean;
};

export function routeToLineString(
  route: RouteResult | null,
  pickup: LngLat,
  drop: LngLat,
): GeoJSON.LineString {
  if (route?.geometry?.coordinates?.length) {
    return route.geometry;
  }
  return {
    type: "LineString",
    coordinates: [pickup, drop],
  };
}

export function snapshotToClientPayload(snapshot: BookingSnapshot) {
  return {
    pickupAddress: snapshot.pickupAddress,
    dropAddress: snapshot.dropAddress,
    pickupLocation: snapshot.pickupLocation,
    dropLocation: snapshot.dropLocation,
    tripDistanceKm: snapshot.tripDistanceKm,
    durationMinutes: snapshot.durationMinutes,
    fare: snapshot.fare,
    vehicleType: snapshot.vehicleType,
    routePolyline: snapshot.routePolyline,
    pricingSnapshot: snapshot.pricingSnapshot,
  };
}
