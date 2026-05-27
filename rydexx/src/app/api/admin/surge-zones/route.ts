import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import SurgeZone from "@/models/surgeZone.model";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, multiplier, area } = body;

    if (!name || !multiplier || !area) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await dbConnect();

    const newZone = await SurgeZone.create({
      name,
      multiplier,
      area, // { type: 'Polygon', coordinates: [[[lng,lat],...]] }
      isActive: true
    });

    return NextResponse.json({ success: true, data: newZone });
  } catch (error: any) {
    console.error("Failed to create surge zone:", error);
    return NextResponse.json({ error: "Failed to create surge zone" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing zone id" }, { status: 400 });
    }

    await dbConnect();
    await SurgeZone.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete surge zone:", error);
    return NextResponse.json({ error: "Failed to delete surge zone" }, { status: 500 });
  }
}
