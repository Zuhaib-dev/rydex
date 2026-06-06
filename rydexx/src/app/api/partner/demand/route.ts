import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import SearchLog from "@/models/searchLog.model";

const LANDMARKS = [
  { name: "Lal Chowk", coordinates: [74.806, 34.0836] }, // [lng, lat]
  { name: "Dal Lake Gate", coordinates: [74.8465, 34.103] },
  { name: "Airport Bypass", coordinates: [74.795, 34.032] },
  { name: "Chanapora", coordinates: [74.801, 34.053] },
  { name: "Karan Nagar", coordinates: [74.797, 34.091] },
  { name: "Hazratbal", coordinates: [74.839, 34.124] },
  { name: "Rajbagh", coordinates: [74.819, 34.072] }
];

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
}

function getBearingDirection(lat1: number, lon1: number, lat2: number, lon2: number): string {
  const dLng = (lon2 - lon1) * Math.PI / 180;
  const sLat = lat1 * Math.PI / 180;
  const dLat = lat2 * Math.PI / 180;
  
  const y = Math.sin(dLng) * Math.cos(dLat);
  const x = Math.cos(sLat) * Math.sin(dLat) - Math.sin(sLat) * Math.cos(dLat) * Math.cos(dLng);
  let brng = Math.atan2(y, x) * 180 / Math.PI;
  brng = (brng + 360) % 360;
  
  if (brng >= 337.5 || brng < 22.5) return "North";
  if (brng >= 22.5 && brng < 67.5) return "North-East";
  if (brng >= 67.5 && brng < 112.5) return "East";
  if (brng >= 112.5 && brng < 157.5) return "South-East";
  if (brng >= 157.5 && brng < 202.5) return "South";
  if (brng >= 202.5 && brng < 247.5) return "South-West";
  if (brng >= 247.5 && brng < 292.5) return "West";
  return "North-West";
}

export async function GET(request: NextRequest) {
  try {
    await connectDb();
    const session = await auth();
    
    if (!session || session.user?.role !== "partner") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const driverId = session.user.id;
    const dbUser = await User.findById(driverId).lean();
    if (!dbUser) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    const driverCoordinates = dbUser.location?.coordinates || [74.7973, 34.0837]; // Lng, Lat Srinagar center fallback
    const [driverLng, driverLat] = driverCoordinates;

    // Check search logs in the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let searchLogs = await SearchLog.find({
      createdAt: { $gte: oneDayAgo }
    }).select("location").lean();

    // Auto-seed search logs if database is empty
    if (searchLogs.length === 0) {
      const seedData = [];
      // Seed 25 mock logs clustered near Srinagar landmarks
      for (let i = 0; i < 25; i++) {
        const landmark = LANDMARKS[i % LANDMARKS.length];
        const offsetLng = (Math.random() - 0.5) * 0.012; // ~1km deviation
        const offsetLat = (Math.random() - 0.5) * 0.012;
        seedData.push({
          location: {
            type: "Point",
            coordinates: [landmark.coordinates[0] + offsetLng, landmark.coordinates[1] + offsetLat]
          },
          createdAt: new Date(Date.now() - Math.random() * 8 * 60 * 60 * 1000) // within last 8 hrs
        });
      }
      await SearchLog.insertMany(seedData);
      searchLogs = await SearchLog.find({
        createdAt: { $gte: oneDayAgo }
      }).select("location").lean();
    }

    // Fetch all online drivers to compute density
    const onlineDrivers = await User.find({
      role: "partner",
      isOnline: true,
      location: { $exists: true }
    }).select("location").lean();

    // Compute metrics for each landmark
    const landmarkMetrics = LANDMARKS.map((lm) => {
      const [lmLng, lmLat] = lm.coordinates;
      
      // Count searches in last 24h within 2.5km
      const searchCount = searchLogs.filter((log) => {
        if (!log.location?.coordinates) return false;
        const [logLng, logLat] = log.location.coordinates;
        return getDistanceKm(lmLat, lmLng, logLat, logLng) <= 2.5;
      }).length;

      // Count online drivers within 2.5km
      const driverCount = onlineDrivers.filter((d) => {
        if (!d.location?.coordinates) return false;
        const [dLng, dLat] = d.location.coordinates;
        return getDistanceKm(lmLat, lmLng, dLat, dLng) <= 2.5;
      }).length;

      const distance = getDistanceKm(driverLat, driverLng, lmLat, lmLng);
      const ratio = searchCount / (driverCount + 1);

      return {
        ...lm,
        searchCount,
        driverCount,
        ratio,
        distance
      };
    });

    // Select recommendation: Find landmark with highest search density/driver ratio
    // If multiple landmarks have positive ratio, prefer the one with highest ratio.
    const sortedRecommendations = [...landmarkMetrics].sort((a, b) => b.ratio - a.ratio);
    const bestRecommended = sortedRecommendations[0] || landmarkMetrics[0];

    const distance = getDistanceKm(driverLat, driverLng, bestRecommended.coordinates[1], bestRecommended.coordinates[0]);
    const bearing = getBearingDirection(driverLat, driverLng, bestRecommended.coordinates[1], bestRecommended.coordinates[0]);
    
    // Multiplier dynamic calculation
    const multiplier = Math.min(5, Math.max(1.5, Math.round((bestRecommended.ratio * 2 + 1) * 10) / 10));

    const isInside = distance <= 0.4;
    let message = "";
    if (isInside) {
      message = `High demand in your area. Stay near ${bestRecommended.name} to find bookings ${multiplier}x faster.`;
    } else {
      message = `Low demand in your area. Move ${distance} km ${bearing} to ${bestRecommended.name} to find bookings ${multiplier}x faster.`;
    }

    return NextResponse.json({
      success: true,
      hotspots: searchLogs.map(log => log.location?.coordinates),
      recommendation: {
        recommendedPlaceName: bestRecommended.name,
        recommendedLocation: bestRecommended.coordinates,
        distanceKm: distance,
        bearing,
        multiplier,
        message,
        isInside
      }
    });

  } catch (error: any) {
    console.error("Failed to fetch driver demand recommendation:", error);
    return NextResponse.json({ error: "Failed to fetch recommendation" }, { status: 500 });
  }
}
