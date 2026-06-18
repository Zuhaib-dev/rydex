import { NextRequest, NextResponse } from "next/server";


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

  // 2. Mapbox Conditional Logic
  const MAP_PROVIDER = process.env.NEXT_PUBLIC_ACTIVE_MAP_PROVIDER || "ola";
  if (MAP_PROVIDER === "mapbox") {
    const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (MAPBOX_TOKEN) {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${startLng},${startLat};${endLng},${endLat}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
      try {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            const adjustedDuration = kashmirAdjusted ? route.duration * KASHMIR_DURATION_FACTOR : route.duration;
            const result = {
              geometry: route.geometry,
              distanceMeters: route.distance,
              durationSeconds: adjustedDuration,
              durationMinutes: adjustedDuration / 60,
              distanceKm: route.distance / 1000,
              kashmirAdjusted,
            };
            cache.set(cacheKey, { data: result, expiry: now + 8000 });
            return NextResponse.json(result);
          }
        }
      } catch (err) {
        console.warn("[Mapbox Routing Proxy] Mapbox request failed:", err);
      }
    }
  }

  // 3. Ola Maps Fallback (Primary default)
  const OLA_API_KEY = process.env.NEXT_PUBLIC_OLA_MAPS_API_KEY;
  if (!OLA_API_KEY) {
    return NextResponse.json({ error: "Routing tokens not configured" }, { status: 500 });
  }

  const url = `https://api.olamaps.io/routing/v1/directions?origin=${startLat},${startLng}&destination=${endLat},${endLng}&api_key=${OLA_API_KEY}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
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
    const polyline = require("@mapbox/polyline");
    // decode returns array of [lat, lng], geojson expects array of [lng, lat]
    const coords = polyline.decode(route.overview_polyline).map((c: number[]) => [c[1], c[0]]);

    const geometry = {
      type: "LineString",
      coordinates: coords
    };

    const result = {
      geometry,
      distanceMeters,
      durationSeconds: adjustedDuration,
      durationMinutes: adjustedDuration / 60,
      distanceKm: distanceMeters / 1000,
      kashmirAdjusted,
    };

    // Cache for 8 seconds
    cache.set(cacheKey, { data: result, expiry: now + 8000 });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[Ola Maps Proxy] routing failed:", err);
    return NextResponse.json({ error: "Failed to fetch routing from map provider" }, { status: 500 });
  }
}
