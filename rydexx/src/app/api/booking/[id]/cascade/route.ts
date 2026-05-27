import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/db";
import { cascadeBooking } from "@/lib/matchmaker";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await connectDb();

    const body = await req.json();
    const { driverId } = body;

    if (!driverId) {
      return NextResponse.json({ message: "driverId is required" }, { status: 400 });
    }

    const result = await cascadeBooking(id, driverId);

    if (!result.success) {
      return NextResponse.json(
        { message: result.message || "Failed to cascade booking" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, cascaded: result.cascaded });
  } catch (error: any) {
    console.error("Cascade booking error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
