import {
  distanceMeters,
  isInKashmir,
  KASHMIR_DURATION_FACTOR,
  type LatLng,
} from "@/lib/mapboxRouting";
import {
  ROAD_DISTANCE_FACTOR_DEFAULT,
  ROAD_DISTANCE_FACTOR_KASHMIR,
} from "./config";

/** GeoJSON point [lng, lat] */
export type LngLat = [number, number];

export function lngLatToLatLng([lng, lat]: LngLat): LatLng {
  return [lat, lng];
}

/** Straight-line distance in meters between two GeoJSON points */
export function straightLineMeters(a: LngLat, b: LngLat): number {
  return distanceMeters(lngLatToLatLng(a), lngLatToLatLng(b));
}

/**
 * Estimated road distance without calling Mapbox (fast, for sorting/filtering).
 * Applies a Kashmir terrain factor when either point is in-region.
 */
export function estimateRoadDistanceMeters(a: LngLat, b: LngLat): number {
  const straight = straightLineMeters(a, b);
  const factor =
    isInKashmir(a[1], a[0]) || isInKashmir(b[1], b[0])
      ? ROAD_DISTANCE_FACTOR_KASHMIR
      : ROAD_DISTANCE_FACTOR_DEFAULT;
  return Math.round(straight * factor);
}

const VEHICLE_SPEED_KMH: Record<string, number> = {
  bike: 28,
  auto: 32,
  car: 38,
  truck: 30,
  loading: 26,
};

/** Estimated minutes for partner to reach pickup */
export function estimatePickupEtaMinutes(
  distanceMeters: number,
  vehicleType: string,
): number {
  const kmh = VEHICLE_SPEED_KMH[vehicleType] ?? 32;
  const hours = distanceMeters / 1000 / kmh;
  const minutes = hours * 60 * KASHMIR_DURATION_FACTOR;
  return Math.max(2, Math.round(minutes));
}

export function formatDistanceKm(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}
