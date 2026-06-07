import { estimateRoadDistanceMeters, type LngLat } from "@/lib/matching/geo";

type VehiclePricing = {
  baseFare?: number | null;
  perKmRate?: number | null;
};

export function calculateTripFare(
  vehicle: VehiclePricing,
  tripDistanceKm: number,
): number {
  const base = Number(vehicle.baseFare) || 0;
  const rate = Number(vehicle.perKmRate) || 0;
  const km = Math.max(0, tripDistanceKm);
  const calculated = Math.round(base + km * rate);
  // Enforce a minimum fare of ₹30 or the base fare (whichever is higher) to avoid zero-fare trips
  return Math.max(30, base, calculated);
}

/** Trip distance from pickup → drop (road estimate, km) */
export function tripDistanceKmFromCoords(
  pickup: LngLat,
  drop: LngLat,
): number {
  const meters = estimateRoadDistanceMeters(pickup, drop);
  return Math.round((meters / 1000) * 100) / 100;
}

export function resolveTripDistanceKm(
  inputKm: unknown,
  pickup: LngLat,
  drop: LngLat,
): number {
  const parsed = Number(inputKm);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return tripDistanceKmFromCoords(pickup, drop);
}
