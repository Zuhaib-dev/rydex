import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createLockedBookingQuote } from "@/lib/createBookingQuote";
import { snapshotToClientPayload } from "@/lib/bookingSnapshot";
import { isRateLimited } from "@/lib/rateLimit";
import { checkBookingGeoFence } from "@/lib/geoFence";
import connectDb from "@/lib/db";
import User from "@/models/user.model";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Rate Limiting: Max 5 quotes per 1 minute (60 seconds) per user
  const limitKey = `quote:${session.user.id}`;
  const limited = await isRateLimited(limitKey, 5, 60);
  if (limited) {
    return NextResponse.json(
      { message: "Too many quote requests. Please wait a minute." },
      { status: 429 },
    );
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
    passengers,
    notes,
    scheduledAt,
    promoCode,
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

  // ── Kashmir Geo-Fence Check ──
  const geoFence = await checkBookingGeoFence(pickupLat, pickupLng, dropLat, dropLng);

  if (!geoFence.allowed) {
    return NextResponse.json(
      {
        message: geoFence.reason || "Bookings are not available for this route.",
        code: "GEO_BLOCKED",
        zoneName: geoFence.zoneName,
      },
      { status: 403 },
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
    passengers,
    notes,
    scheduledAt,
    promoCode,
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
    // Include geo-fence cash-only flag so frontend can update payment UI
    cashOnly: geoFence.cashOnly,
    cashOnlyReason: geoFence.cashOnly ? geoFence.reason : undefined,
    cashOnlyZone: geoFence.cashOnly ? geoFence.zoneName : undefined,
  });
}
