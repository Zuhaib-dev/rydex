import type { Document } from "mongoose";
import { emitToSocketServer } from "@/lib/socketServer";
import { emitBookingUpdated } from "@/lib/bookingEvents";
import { MATCH_ACCEPT_TIMEOUT_MS, radiusKm } from "./config";
import type { MatchedPartner } from "./findPartner";
import { formatDistanceKm } from "./geo";

type BookingDoc = Document & {
  _id: unknown;
  toObject?: () => Record<string, unknown>;
};

export function buildDispatchMeta(match: MatchedPartner, radiusMeters: number) {
  return {
    distanceMeters: match.roadDistanceMeters,
    distanceKm: match.roadDistanceMeters / 1000,
    distanceLabel: formatDistanceKm(match.roadDistanceMeters),
    etaMinutes: match.etaMinutes,
    radiusMeters,
    radiusKm: radiusKm(radiusMeters),
    expiresAt: Date.now() + MATCH_ACCEPT_TIMEOUT_MS,
    partnerName: match.name,
    vehicleType: match.vehicleType,
  };
}

/** Notify assigned partner and user; payload includes dispatch metadata for UI */
export async function dispatchBookingToPartner(
  booking: BookingDoc,
  match: MatchedPartner,
  radiusMeters: number,
  options?: { previousDriverId?: string },
) {
  const dispatch = buildDispatchMeta(match, radiusMeters);
  const base =
    typeof booking.toObject === "function"
      ? booking.toObject()
      : (booking as unknown as Record<string, unknown>);

  const payload = {
    ...base,
    dispatch,
  };

  await emitToSocketServer({
    userId: match.partnerId,
    event: "new-booking",
    data: payload,
    bookingId: String(booking._id),
  });

  await emitBookingUpdated(booking, {
    bookingId: String(booking._id),
    status: "requested",
    matchRadiusMeters: radiusMeters,
    matchRadiusKm: dispatch.radiusKm,
    dispatchEtaMinutes: match.etaMinutes,
    searchingMessage: `Notified nearest ${match.vehicleType} rider (${dispatch.distanceLabel} away)`,
  });

  if (options?.previousDriverId) {
    await emitToSocketServer({
      userId: options.previousDriverId,
      event: "booking-updated",
      data: {
        bookingId: String(booking._id),
        status: "expired",
        eventId: `expired-${Date.now()}`,
      },
    });
  }

  return dispatch;
}
