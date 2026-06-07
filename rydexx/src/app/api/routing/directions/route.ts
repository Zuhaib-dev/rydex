import { NextRequest, NextResponse } from "next/server";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const ORS_TOKEN = process.env.NEXT_PUBLIC_OPENROUTE_TOKEN;
const USE_ORS = process.env.NEXT_PUBLIC_USE_OPENROUTE === "true";

// Simple in-memory cache to prevent duplicate request storms in development
const cache = new Map<string, { data: any; expiry: number }>();

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const start = searchParams.get("start"); // "lat,lng"
  const end = searchParams.get("end");     // "lat,lng"

  if (!start || !end) {
    return NextResponse.json({ error: "Missing start or end coordinates" }, { status: 400 });
  }

  const cacheKey = `${start}:${end}`;
  const now = Date.now();
  const cached = cache.get(cacheKey);
  if (cached && cached.expiry > now) {
    return NextResponse.json(cached.data);
  }

  const [startLat, startLng] = start.split(",").map(Number);
  const [endLat, endLng] = end.split(",").map(Number);

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
    const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_TOKEN}&start=${startLng},${startLat}&end=${endLng},${endLat}`;

    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const feature = data?.features?.[0];
        if (feature) {
          const rawDuration = feature.properties.summary.duration as number;
          const distanceMeters = feature.properties.summary.distance as number;
          const adjustedDuration = kashmirAdjusted ? rawDuration * KASHMIR_DURATION_FACTOR : rawDuration;

          const result = {
            geometry: feature.geometry,
            distanceMeters,
            durationSeconds: adjustedDuration,
            durationMinutes: adjustedDuration / 60,
            distanceKm: distanceMeters / 1000,
            kashmirAdjusted,
          };

          // Cache for 8 seconds to prevent HMR and rapid redraw storms
          cache.set(cacheKey, { data: result, expiry: now + 8000 });
          return NextResponse.json(result);
        }
      } else {
        console.warn(`[ORS API Proxy] ORS failed with status: ${res.status}. Falling back to Mapbox.`);
      }
    } catch (err) {
      console.warn("[ORS API Proxy] ORS request failed:", err);
    }
  }

  // 2. Mapbox Fallback (Default)
  if (!MAPBOX_TOKEN) {
    return NextResponse.json({ error: "Routing tokens not configured" }, { status: 500 });
  }

  const coordStr = `${startLng},${startLat};${endLng},${endLat}`;
  const params = new URLSearchParams({
    geometries: "geojson",
    overview: "full",
    steps: "false",
    access_token: MAPBOX_TOKEN,
  });

  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordStr}?${params}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!data?.routes?.length) {
      return NextResponse.json({ error: "No routes found" }, { status: 404 });
    }

    const route = data.routes[0];
    const rawDuration = route.duration as number;
    const adjustedDuration = kashmirAdjusted ? rawDuration * KASHMIR_DURATION_FACTOR : rawDuration;

    const result = {
      geometry: route.geometry,
      distanceMeters: route.distance,
      durationSeconds: adjustedDuration,
      durationMinutes: adjustedDuration / 60,
      distanceKm: route.distance / 1000,
      kashmirAdjusted,
    };

    // Cache for 8 seconds
    cache.set(cacheKey, { data: result, expiry: now + 8000 });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[ORS API Proxy] Mapbox routing failed:", err);
    return NextResponse.json({ error: "Failed to fetch routing from map provider" }, { status: 500 });
  }
}
