import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import { findPartnerWithRadiusExpansion } from "@/lib/matching/findPartner";
import { dispatchBookingToPartner } from "@/lib/matching/dispatch";
import { notifyAdminDashboard } from "@/lib/adminEvents";

/**
 * POST /api/booking/dispatch-scheduled
 *
 * Internal cron endpoint — dispatches scheduled bookings whose scheduled time
 * is within the next 10 minutes, or expires them if they are past scheduled by >15 minutes.
 *
 * Protected by CASCADE_INTERNAL_SECRET header.
 */
export async function POST(req: NextRequest) {
  // ── Internal auth ─────────────────────────────────────────────
  const secret = process.env.CASCADE_INTERNAL_SECRET;
  if (secret && req.headers.get("x-cascade-secret") !== secret) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await connectDb();

  const now = new Date();
  const tenMinsFromNow = new Date(now.getTime() + 10 * 60 * 1000);
  const fifteenMinsAgo = new Date(now.getTime() - 15 * 60 * 1000);

  // 1. Expire scheduled bookings that are past scheduled by >15 mins and never matched
  const expiredScheduled = await Booking.updateMany(
    {
      status: "scheduled",
      scheduledAt: { $lt: fifteenMinsAgo },
    },
    {
      $set: { status: "expired" },
    }
  );

  if (expiredScheduled.modifiedCount > 0) {
    console.log(`[dispatch-scheduled] Expired ${expiredScheduled.modifiedCount} outdated scheduled bookings.`);
    await notifyAdminDashboard({ scope: "all", reason: "booking-updated" });
  }

  // 2. Query bookings that need dispatching
  const scheduledBookings = await Booking.find({
    status: "scheduled",
    scheduledAt: { $gte: fifteenMinsAgo, $lte: tenMinsFromNow },
  });

  if (scheduledBookings.length === 0) {
    return NextResponse.json({ success: true, dispatched: 0 });
  }

  let dispatchedCount = 0;

  for (const booking of scheduledBookings) {
    try {
      const pickupCoordinates = booking.pickupLocation.coordinates as [number, number];

      // Match driver
      const matchedPartner = await findPartnerWithRadiusExpansion({
        pickupCoordinates,
        vehicleType: booking.vehicleType,
        excludePartnerIds: [],
      });

      if (matchedPartner) {
        // Update booking state
        booking.driver = matchedPartner.match.partnerId as any;
        booking.vehicle = matchedPartner.match.vehicleId as any;
        booking.driverMobileNumber = matchedPartner.match.mobileNumber;
        booking.driverAssignedAt = new Date();
        booking.status = "requested";
        booking.matchRadiusMeters = matchedPartner.radiusMeters;
        booking.matchRadiusTierIndex = matchedPartner.tierIndex;
        if (!booking.attemptedDrivers.includes(matchedPartner.match.partnerId as any)) {
          booking.attemptedDrivers.push(matchedPartner.match.partnerId as any);
        }

        await booking.save();

        // Dispatch via socket to the driver
        await dispatchBookingToPartner(
          booking,
          matchedPartner.match,
          matchedPartner.radiusMeters
        );

        dispatchedCount++;
        console.log(`[dispatch-scheduled] Dispatched scheduled booking ${booking._id} to driver ${matchedPartner.match.partnerId}`);
      } else {
        console.log(`[dispatch-scheduled] No driver found yet for scheduled booking ${booking._id}. Retrying in next cron run.`);
      }
    } catch (err) {
      console.error(`[dispatch-scheduled] Failed to dispatch booking ${booking._id}:`, err);
    }
  }

  if (dispatchedCount > 0) {
    await notifyAdminDashboard({ scope: "all", reason: "booking-updated" });
  }

  return NextResponse.json({ success: true, dispatched: dispatchedCount });
}
