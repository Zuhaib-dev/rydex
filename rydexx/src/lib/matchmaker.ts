import connectDb from "./db";
import Booking from "@/models/booking.model";
import mongoose from "mongoose";
import {
  getRadiusTier,
  nextRadiusTierIndex,
  radiusKm,
} from "./matching/config";
import { findClosestEligiblePartner } from "./matching/findPartner";
import { dispatchBookingToPartner } from "./matching/dispatch";
import { emitBookingUpdated } from "./bookingEvents";
import { getRedisClient } from "@/lib/redis";
import { trace, SpanStatusCode } from "@opentelemetry/api";

const tracer = trace.getTracer("rydexx-matchmaker");

export async function cascadeBooking(bookingId: string, currentDriverId: string) {
  return tracer.startActiveSpan(
    "matchmaker.cascadeBooking",
    { attributes: { "booking.id": bookingId, "driver.id": currentDriverId } },
    async (span) => {
      try {
        await connectDb();

        const booking = await Booking.findById(bookingId);
        if (!booking) {
          span.setStatus({ code: SpanStatusCode.ERROR, message: "Booking not found" });
          console.error(`Booking not found: ${bookingId}`);
          return { success: false, message: "Booking not found" };
        }

        if (
          booking.status !== "requested" ||
          String(booking.driver) !== String(currentDriverId)
        ) {
          return { success: false, message: "Booking is already processed or driver changed" };
        }

        const oldDriverId = String(booking.driver);

        // Release old driver's lock
        await tracer.startActiveSpan("redis.releaseDriverLock", async (lockSpan) => {
          try {
            const redis = getRedisClient();
            await redis.del(`lock:driver:${oldDriverId}`);
            lockSpan.setAttribute("driver.id", oldDriverId);
          } catch (err) {
            console.warn("[cascadeBooking] Redis lock release failed:", err);
            lockSpan.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
          } finally {
            lockSpan.end();
          }
        });

        const pickupCoordinates = booking.pickupLocation.coordinates as [
          number,
          number,
        ];

        const attempted = booking.attemptedDrivers.map((id: unknown) => String(id));
        if (!attempted.includes(String(currentDriverId))) {
          booking.attemptedDrivers.push(
            new mongoose.Types.ObjectId(currentDriverId),
          );
        }

        let tierIndex = booking.matchRadiusTierIndex ?? 0;
        let radiusMeters =
          booking.matchRadiusMeters ?? getRadiusTier(tierIndex);

        const excludeIds = booking.attemptedDrivers.map((id: unknown) => String(id));

        // Find next eligible partner
        let match = await tracer.startActiveSpan(
          "matchmaker.findClosestEligiblePartner",
          { attributes: { "search.radius_meters": radiusMeters, "search.tier": tierIndex } },
          async (searchSpan) => {
            try {
              return await findClosestEligiblePartner({
                pickupCoordinates,
                vehicleType: booking.vehicleType,
                excludePartnerIds: excludeIds,
                radiusMeters,
              });
            } catch (err) {
              searchSpan.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
              throw err;
            } finally {
              searchSpan.end();
            }
          }
        );

        // Expand search radius when no more riders in current tier
        while (!match) {
          const nextTier = nextRadiusTierIndex(tierIndex);
          if (nextTier === null) break;

          tierIndex = nextTier;
          radiusMeters = getRadiusTier(tierIndex);
          booking.matchRadiusTierIndex = tierIndex;
          booking.matchRadiusMeters = radiusMeters;

          // Emitting the update instantly (without blocking on DB save) keeps the UI perfectly real-time
          // We will save the mutated booking object after the loop finishes.
          await emitBookingUpdated(booking, {
            bookingId: String(booking._id),
            status: "requested",
            matchRadiusMeters: radiusMeters,
            matchRadiusKm: radiusKm(radiusMeters),
            searchingMessage: `Expanding search to ${radiusKm(radiusMeters)} km…`,
          });

          match = await tracer.startActiveSpan(
            "matchmaker.findClosestEligiblePartner",
            { attributes: { "search.radius_meters": radiusMeters, "search.tier": tierIndex, "search.expanded": true } },
            async (searchSpan) => {
              try {
                return await findClosestEligiblePartner({
                  pickupCoordinates,
                  vehicleType: booking.vehicleType,
                  excludePartnerIds: excludeIds,
                  radiusMeters,
                });
              } catch (err) {
                searchSpan.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
                throw err;
              } finally {
                searchSpan.end();
              }
            }
          );
        }

        if (match) {
          booking.driver = new mongoose.Types.ObjectId(match.partnerId);
          booking.vehicle = new mongoose.Types.ObjectId(match.vehicleId);
          booking.driverMobileNumber = match.mobileNumber;
          booking.driverAssignedAt = new Date();
          booking.matchRadiusMeters = radiusMeters;
          booking.matchRadiusTierIndex = tierIndex;
          booking.attemptedDrivers.push(
            new mongoose.Types.ObjectId(match.partnerId),
          );
          booking.status = "requested";
          await booking.save();

          span.setAttributes({
            "match.driver_id": match.partnerId,
            "match.radius_meters": radiusMeters,
            "match.tier": tierIndex,
          });

          await tracer.startActiveSpan(
            "matchmaker.dispatchBookingToPartner",
            { attributes: { "driver.id": match.partnerId, "booking.id": bookingId } },
            async (dispatchSpan) => {
              try {
                await dispatchBookingToPartner(booking, match, radiusMeters, {
                  previousDriverId: oldDriverId,
                });
              } catch (err) {
                dispatchSpan.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
                throw err;
              } finally {
                dispatchSpan.end();
              }
            }
          );

          return {
            success: true,
            cascaded: true,
            nextDriverId: match.partnerId,
            radiusMeters,
          };
        }

        // No drivers found anywhere
        booking.status = "rejected";
        await booking.save();

        span.setAttribute("cascade.result", "no_drivers");

        await emitBookingUpdated(booking, {
          bookingId: String(booking._id),
          status: "rejected",
          searchingMessage: "No drivers available in your area",
        });

        const { emitToSocketServer } = await import("./socketServer");
        await emitToSocketServer({
          userId: oldDriverId,
          event: "booking-updated",
          data: {
            bookingId: String(booking._id),
            status: "expired",
          },
        });

        return { success: true, cascaded: false, message: "No drivers available" };
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        throw err;
      } finally {
        span.end();
      }
    }
  );
}
