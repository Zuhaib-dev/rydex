/**
 * Mapbox Directions helpers tuned for Kashmir valley / mountain road realities.
 * Applies a conservative duration factor inside the region and avoids over-snapping.
 */
import * as turf from "@turf/turf";

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

/** Haversine distance in meters (now powered by turf.js) */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const ptA = turf.point([a[1], a[0]]);
  const ptB = turf.point([b[1], b[0]]);
  return turf.distance(ptA, ptB, { units: "meters" });
}

export async function fetchDrivingRoute(
  waypoints: LatLng[],
  options?: { signal?: AbortSignal },
): Promise<RouteResult | null> {
  if (waypoints.length < 2) return null;

  const start = waypoints[0];
  const end = waypoints[waypoints.length - 1];

  // Server-side environment check to prevent relative URL fetch errors
  if (typeof window === "undefined") {
    try {
      const startLat = start[0];
      const startLng = start[1];
      const endLat = end[0];
      const endLng = end[1];

      const kashmirAdjusted = isInKashmir(startLat, startLng) || isInKashmir(endLat, endLng);
      const MAP_PROVIDER = process.env.NEXT_PUBLIC_ACTIVE_MAP_PROVIDER || "ola";
      const OLA_API_KEY = process.env.NEXT_PUBLIC_OLA_MAPS_API_KEY;
      const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

      // Try Mapbox if selected
      if (MAP_PROVIDER === "mapbox" && MAPBOX_TOKEN) {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${startLng},${startLat};${endLng},${endLat}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
        const res = await fetch(url, { signal: options?.signal });
        if (res.ok) {
          const data = await res.json();
          if (data?.routes?.length) {
            const route = data.routes[0];
            const rawDuration = route.duration;
            const distanceMeters = route.distance;
            const adjustedDuration = kashmirAdjusted ? rawDuration * KASHMIR_DURATION_FACTOR : rawDuration;

            return {
              geometry: route.geometry,
              distanceMeters,
              durationSeconds: adjustedDuration,
              durationMinutes: adjustedDuration / 60,
              distanceKm: distanceMeters / 1000,
              kashmirAdjusted,
            };
          }
        }
      }

      // Try Ola Maps
      if (OLA_API_KEY) {
        const url = `https://api.olamaps.io/routing/v1/directions?origin=${startLat},${startLng}&destination=${endLat},${endLng}&api_key=${OLA_API_KEY}`;
        const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, signal: options?.signal });
        
        if (res.ok) {
          const data = await res.json();
          if (data?.routes?.length) {
            const route = data.routes[0];
            const leg = route.legs?.[0];
            const rawDuration = leg?.duration || 0;
            const distanceMeters = leg?.distance || 0;
            const adjustedDuration = kashmirAdjusted ? rawDuration * KASHMIR_DURATION_FACTOR : rawDuration;

            const polyline = require("@mapbox/polyline");
            const coords = polyline.decode(route.overview_polyline).map((c: number[]) => [c[1], c[0]]);

            return {
              geometry: {
                type: "LineString",
                coordinates: coords
              },
              distanceMeters,
              durationSeconds: adjustedDuration,
              durationMinutes: adjustedDuration / 60,
              distanceKm: distanceMeters / 1000,
              kashmirAdjusted,
            };
          }
        }
      }
    } catch (err) {
      console.warn("[fetchDrivingRoute] Direct server-side routing query failed:", err);
    }
    return null;
  }

  // Client-side calls the API proxy to avoid CORS problems
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
