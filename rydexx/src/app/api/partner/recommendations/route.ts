import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDb from "@/lib/db";
import Recommendation from "@/models/recommendation.model";

export async function POST(request: NextRequest) {
  try {
    await connectDb();
    const session = await auth();
    if (!session || session.user?.role !== "partner") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { currentLocation, recommendedLocation, recommendedPlaceName, distanceKm, multiplier } = body;

    if (
      !currentLocation ||
      !recommendedLocation ||
      !recommendedPlaceName ||
      distanceKm === undefined ||
      !multiplier
    ) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const newRecommendation = await Recommendation.create({
      driver: session.user.id,
      currentLocation,
      recommendedLocation,
      recommendedPlaceName,
      distanceKm,
      multiplier,
      status: "pending",
    });

    return NextResponse.json({ success: true, data: newRecommendation });
  } catch (error: any) {
    console.error("Failed to create recommendation:", error);
    return NextResponse.json({ error: "Failed to create recommendation" }, { status: 500 });
  }
}
