import { NextRequest, NextResponse } from "next/server";
import polyline from "@mapbox/polyline";
import { normalizeMapboxSteps, normalizeOlaSteps, normalizeOrsSteps } from "@/lib/routeInstructions";


const ORS_TOKEN = process.env.NEXT_PUBLIC_OPENROUTE_TOKEN;
const USE_ORS = process.env.NEXT_PUBLIC_USE_OPENROUTE === "true";

// Bound the per-instance cache: live GPS coordinates continually change, so
// expired keys must be removed instead of accumulating for the process lifetime.
const ROUTE_CACHE_TTL_MS = 8_000;
const ROUTE_CACHE_MAX_ENTRIES = 256;
const cache = new Map<string, { data: unknown; expiry: number }>();

function storeCachedRoute(key: string, data: unknown, now: number) {
  for (const [cachedKey, entry] of cache) {
    if (entry.expiry <= now) cache.delete(cachedKey);
  }
  while (cache.size >= ROUTE_CACHE_MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (!oldestKey) break;
    cache.delete(oldestKey);
  }
  cache.set(key, { data, expiry: now + ROUTE_CACHE_TTL_MS });
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const start = searchParams.get("start"); // "lat,lng"
  const end = searchParams.get("end");     // "lat,lng"

  if (!start || !end) {
    return NextResponse.json({ error: "Missing start or end coordinates" }, { status: 400 });
  }

  const [startLat, startLng] = start.split(",").map(Number);
  const [endLat, endLng] = end.split(",").map(Number);
  if (
    !Number.isFinite(startLat) || !Number.isFinite(startLng) ||
    !Number.isFinite(endLat) || !Number.isFinite(endLng) ||
    Math.abs(startLat) > 90 || Math.abs(endLat) > 90 ||
    Math.abs(startLng) > 180 || Math.abs(endLng) > 180
  ) {
    return NextResponse.json({ error: "Invalid start or end coordinates" }, { status: 400 });
  }

  const requestedVehicleType = searchParams.get("vehicleType") ?? "car";
  const mode = requestedVehicleType === "bike"
    ? "bike"
    : requestedVehicleType === "auto"
      ? "auto"
      : "driving";
  const cacheKey = `${mode}:${startLat.toFixed(5)},${startLng.toFixed(5)}:${endLat.toFixed(5)},${endLng.toFixed(5)}`;
  const now = Date.now();
  const cached = cache.get(cacheKey);
  if (cached && cached.expiry > now) return NextResponse.json(cached.data);
  if (cached) cache.delete(cacheKey);

  // Check Kashmir adjustment factor
  const KASHMIR_BOUNDS = { minLat: 32.15, maxLat: 35.55, minLng: 73.05, maxLng: 80.15 };
  const isInKashmir = (lat: number, lng: number) =>
    lat >= KASHMIR_BOUNDS.minLat && lat <= KASHMIR_BOUNDS.maxLat &&
    lng >= KASHMIR_BOUNDS.minLng && lng <= KASHMIR_BOUNDS.maxLng;

  const kashmirAdjusted = isInKashmir(startLat, startLng) || isInKashmir(endLat, endLng);
  const KASHMIR_DURATION_FACTOR = 1.22;

  // 1. Try OpenRouteService
  if (USE_ORS && ORS_TOKEN) {
    // ORS takes start and end as start=lng,lat&end=lng,lat
    const orsProfile = mode === "bike" ? "cycling-regular" : "driving-car";
    const url = `https://api.openrouteservice.org/v2/directions/${orsProfile}?api_key=${ORS_TOKEN}&start=${startLng},${startLat}&end=${endLng},${endLat}&instructions=true&instructions_format=text`;

    try {
      const res = await fetch(url, { signal: req.signal });
      if (res.ok) {
        const data = await res.json();
        const feature = data?.features?.[0];
        if (feature) {
          const rawDuration = feature.properties.summary.duration as number;
          const distanceMeters = feature.properties.summary.distance as number;
          const adjustedDuration = kashmirAdjusted ? rawDuration * KASHMIR_DURATION_FACTOR : rawDuration;

          const result = {
            geometry: feature.geometry,
            navigationSteps: normalizeOrsSteps(
              feature.properties?.segments ?? [],
              feature.geometry?.coordinates ?? [],
            ),
            distanceMeters,
            durationSeconds: adjustedDuration,
            durationMinutes: adjustedDuration / 60,
            distanceKm: distanceMeters / 1000,
            kashmirAdjusted,
          };

          storeCachedRoute(cacheKey, result, now);
          return NextResponse.json(result);
        }
      } else {
        console.warn(`[ORS API Proxy] ORS failed with status: ${res.status}. Falling back to Mapbox.`);
      }
    } catch (err) {
      if (req.signal.aborted) return new NextResponse(null, { status: 499 });
      console.warn("[ORS API Proxy] ORS request failed:", err);
    }
  }

  // 2. Mapbox Conditional Logic
  const MAP_PROVIDER = process.env.NEXT_PUBLIC_ACTIVE_MAP_PROVIDER || "ola";
  if (MAP_PROVIDER === "mapbox") {
    const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (MAPBOX_TOKEN) {
      const mapboxProfile = mode === "bike" ? "cycling" : "driving";
      const url = `https://api.mapbox.com/directions/v5/mapbox/${mapboxProfile}/${startLng},${startLat};${endLng},${endLat}?geometries=geojson&overview=full&steps=true&language=en&access_token=${MAPBOX_TOKEN}`;
      try {
        const res = await fetch(url, { signal: req.signal });
        if (res.ok) {
          const data = await res.json();
          if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            const adjustedDuration = kashmirAdjusted ? route.duration * KASHMIR_DURATION_FACTOR : route.duration;
            const result = {
              geometry: route.geometry,
              navigationSteps: normalizeMapboxSteps(route.legs ?? []),
              distanceMeters: route.distance,
              durationSeconds: adjustedDuration,
              durationMinutes: adjustedDuration / 60,
              distanceKm: route.distance / 1000,
              kashmirAdjusted,
            };
            storeCachedRoute(cacheKey, result, now);
            return NextResponse.json(result);
          }
        }
      } catch (err) {
        if (req.signal.aborted) return new NextResponse(null, { status: 499 });
        console.warn("[Mapbox Routing Proxy] Mapbox request failed:", err);
      }
    }
  }

  // 3. Ola Maps Fallback (Primary default)
  const OLA_API_KEY = process.env.NEXT_PUBLIC_OLA_MAPS_API_KEY;
  if (!OLA_API_KEY) {
    return NextResponse.json({ error: "Routing tokens not configured" }, { status: 500 });
  }

  const url = `https://api.olamaps.io/routing/v1/directions?origin=${startLat},${startLng}&destination=${endLat},${endLng}&mode=${mode}&steps=true&language=en&api_key=${OLA_API_KEY}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: req.signal,
    });
    
    if (!res.ok) {
      console.error("[Ola Maps Proxy] Failed with status:", res.status);
      return NextResponse.json({ error: "Failed to fetch routing from Ola Maps" }, { status: 500 });
    }
    
    const data = await res.json();

    if (!data?.routes?.length) {
      return NextResponse.json({ error: "No routes found" }, { status: 404 });
    }

    const route = data.routes[0];
    const leg = route.legs?.[0];
    const rawDuration = leg?.duration || 0; 
    const distanceMeters = leg?.distance || 0;
    const adjustedDuration = kashmirAdjusted ? rawDuration * KASHMIR_DURATION_FACTOR : rawDuration;

    // Decode polyline to GeoJSON LineString (which the frontend expects)
    // decode returns array of [lat, lng], geojson expects array of [lng, lat]
    const coords = polyline.decode(route.overview_polyline).map((c: number[]) => [c[1], c[0]]);

    const geometry = {
      type: "LineString",
      coordinates: coords
    };

    const result = {
      geometry,
      navigationSteps: normalizeOlaSteps(route.legs ?? []),
      distanceMeters,
      durationSeconds: adjustedDuration,
      durationMinutes: adjustedDuration / 60,
      distanceKm: distanceMeters / 1000,
      kashmirAdjusted,
    };

    storeCachedRoute(cacheKey, result, now);
    return NextResponse.json(result);
  } catch (err) {
    if (req.signal.aborted) return new NextResponse(null, { status: 499 });
    console.error("[Ola Maps Proxy] routing failed:", err);
    return NextResponse.json({ error: "Failed to fetch routing from map provider" }, { status: 500 });
  }
}
