/**
 * Mapbox Directions helpers tuned for Kashmir valley / mountain road realities.
 * Applies a conservative duration factor inside the region and avoids over-snapping.
 */

/** Approximate J&K / Kashmir operational bounds */
export const KASHMIR_BOUNDS = {
  minLat: 32.15,
  maxLat: 35.55,
  minLng: 73.05,
  maxLng: 80.15,
};

/** Extra time buffer for winding / elevation-heavy segments */
export const KASHMIR_DURATION_FACTOR = 1.22;

export type LatLng = [number, number]; // [lat, lng]

export type RouteResult = {
  geometry: GeoJSON.LineString;
  distanceMeters: number;
  durationSeconds: number;
  durationMinutes: number;
  distanceKm: number;
  kashmirAdjusted: boolean;
};

export function isInKashmir(lat: number, lng: number): boolean {
  return (
    lat >= KASHMIR_BOUNDS.minLat &&
    lat <= KASHMIR_BOUNDS.maxLat &&
    lng >= KASHMIR_BOUNDS.minLng &&
    lng <= KASHMIR_BOUNDS.maxLng
  );
}

/** Haversine distance in meters */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export async function fetchDrivingRoute(
  waypoints: LatLng[],
  options?: { signal?: AbortSignal },
): Promise<RouteResult | null> {
  if (waypoints.length < 2) return null;

  const start = waypoints[0];
  const end = waypoints[waypoints.length - 1];

  // Request the Next.js API route proxy to resolve client-side CORS issues and limit API rate hit storms
  const url = `/api/routing/directions?start=${start[0]},${start[1]}&end=${end[0]},${end[1]}`;

  try {
    const res = await fetch(url, { signal: options?.signal });
    if (!res.ok) {
      console.warn("API proxy directions request failed with status:", res.status);
      return null;
    }
    const data = await res.json();
    return data as RouteResult;
  } catch (err) {
    if ((err as Error).name !== "AbortError") {
      console.warn("API proxy routing fetch failed:", err);
    }
    return null;
  }
}

export function routeToGeoJSON(geometry: GeoJSON.LineString) {
  return {
    type: "Feature" as const,
    properties: {},
    geometry,
  };
}

/** Bearing degrees for marker rotation (0 = north, clockwise) */
export function bearingDegrees(from: LatLng, to: LatLng): number {
  const lat1 = (from[0] * Math.PI) / 180;
  const lat2 = (to[0] * Math.PI) / 180;
  const dLng = ((to[1] - from[1]) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}
