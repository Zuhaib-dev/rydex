import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import { emitBookingUpdated } from "@/lib/bookingEvents";
import { getRedisClient } from "@/lib/redis";

/**
 * POST /api/booking/expire-stale
 *
 * Internal cron endpoint — expires all bookings stuck in `awaiting_payment`
 * past their paymentDeadline. Called by the socket server every 60 seconds.
 *
 * Protected by CASCADE_INTERNAL_SECRET header (same secret reused for internal calls).
 */
export async function POST(req: NextRequest) {
  // ── Internal auth ─────────────────────────────────────────────
  const secret = process.env.CASCADE_INTERNAL_SECRET;
  if (secret && req.headers.get("x-cascade-secret") !== secret) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await connectDb();

  const now = new Date();

  // Find all bookings that are awaiting_payment AND past their deadline
  const staleBookings = await Booking.find({
    status: "awaiting_payment",
    paymentDeadline: { $lt: now },
  }).populate("driver vehicle");

  if (staleBookings.length === 0) {
    return NextResponse.json({ success: true, expired: 0 });
  }

  const redis = getRedisClient();
  let expiredCount = 0;

  await Promise.all(
    staleBookings.map(async (booking) => {
      try {
        booking.status = "expired";
        await booking.save();

        // Release Redis driver lock so the driver can take new bookings
        if (booking.driver) {
          const driverId =
            typeof booking.driver === "object" && "_id" in booking.driver
              ? String((booking.driver as any)._id)
              : String(booking.driver);
          try {
            await redis.del(`lock:driver:${driverId}`);
          } catch {
            // Non-fatal
          }
        }

        // Notify both user and driver via socket
        await emitBookingUpdated(booking, {
          bookingId: booking._id,
          status: "expired",
        });

        expiredCount++;
      } catch (err) {
        console.error(`[expire-stale] Failed to expire booking ${booking._id}:`, err);
      }
    })
  );

  console.log(`[expire-stale] Expired ${expiredCount} stale awaiting_payment bookings.`);
  return NextResponse.json({ success: true, expired: expiredCount });
}
