import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createLockedBookingQuote } from "@/lib/createBookingQuote";
import { snapshotToClientPayload } from "@/lib/bookingSnapshot";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    pickupAddress,
    dropAddress,
    pickupLat,
    pickupLng,
    dropLat,
    dropLng,
    vehicleId,
    driverId,
  } = body;

  if (
    !pickupAddress ||
    !dropAddress ||
    !vehicleId ||
    typeof pickupLat !== "number" ||
    typeof pickupLng !== "number" ||
    typeof dropLat !== "number" ||
    typeof dropLng !== "number"
  ) {
    return NextResponse.json(
      { message: "Missing required quote fields" },
      { status: 400 },
    );
  }

  const result = await createLockedBookingQuote({
    userId: session.user.id,
    pickupAddress,
    dropAddress,
    pickupLat,
    pickupLng,
    dropLat,
    dropLng,
    vehicleId,
    driverId,
  });

  if (!result.success) {
    return NextResponse.json(
      { message: result.message || "Could not create quote" },
      { status: 400 },
    );
  }

  return NextResponse.json({
    success: true,
    quoteId: result.quoteId,
    expiresAt: result.expiresAt,
    snapshot: snapshotToClientPayload(result.snapshot),
  });
}
