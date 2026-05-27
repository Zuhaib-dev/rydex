import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import SearchLog from "@/models/searchLog.model";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { longitude, latitude } = body;

    if (!longitude || !latitude) {
      return NextResponse.json({ error: "Longitude and latitude are required" }, { status: 400 });
    }

    await dbConnect();

    await SearchLog.create({
      location: {
        type: "Point",
        coordinates: [longitude, latitude]
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to log search metric:", error);
    return NextResponse.json({ error: "Failed to log search metric" }, { status: 500 });
  }
}
