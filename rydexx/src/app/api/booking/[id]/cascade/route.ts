import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/db";
import { cascadeBooking } from "@/lib/matchmaker";
import { auth } from "@/lib/auth";

function isInternalCascade(req: NextRequest): boolean {
  const secret = process.env.CASCADE_INTERNAL_SECRET;
  if (!secret) return false;
  return req.headers.get("x-cascade-secret") === secret;
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    await connectDb();

    const body = await req.json();
    const { driverId } = body;

    if (!driverId) {
      return NextResponse.json(
        { message: "driverId is required" },
        { status: 400 },
      );
    }

    const session = await auth();
    const internal = isInternalCascade(req);

    if (!internal) {
      if (!session?.user?.id) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }
      if (String(session.user.id) !== String(driverId)) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }
    }

    const result = await cascadeBooking(id, driverId);

    if (!result.success) {
      return NextResponse.json(
        { message: result.message || "Failed to cascade booking" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      cascaded: result.cascaded,
      radiusMeters: result.radiusMeters,
    });
  } catch (error) {
    console.error("Cascade booking error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
