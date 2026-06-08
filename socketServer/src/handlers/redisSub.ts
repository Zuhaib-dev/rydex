import axios from "axios";
import User from "../../models/user.models.js";
import { redisPub, redisSub } from "../services/redis.js";
import { activeTimers } from "../services/timers.js";
import { logSocketEvent } from "../services/logger.js";
import { notifyAdminMapThrottled, notifyPublicAvailabilityThrottled } from "../services/notifications.js";

export function setupRedisSub() {
  redisSub.subscribe("__keyevent@0__:expired", (err: Error | null | undefined) => {
    if (err) {
      console.error("Failed to subscribe to Redis expiration channel:", err.message);
    } else {
      console.log("Subscribed to Redis keyspace expiration notifications.");
    }
  });

  redisSub.on("message", async (channel: string, message: string) => {
    if (channel !== "__keyevent@0__:expired") return;

    // Presence heartbeat expiration → mark partner offline
    if (message.startsWith("presence:driver:")) {
      const driverId = message.split(":")[2];
      console.log(`Presence heartbeat expired for driver ${driverId}. Mark offline.`);
      try {
        const updateResult = await User.updateOne(
          { _id: driverId },
          {
            isOnline: false,
            socketId: null,
            isPartnerAvailable: false,
          }
        );
        console.log(`Driver ${driverId} marked offline. Result:`, updateResult);
        await redisPub.zrem("driver:locations:active", driverId);
        notifyAdminMapThrottled();
        notifyPublicAvailabilityThrottled("presence-expired");

        await logSocketEvent(
          "driver_presence_expired",
          `Presence heartbeat expired. Driver marked offline automatically.`,
          "warning",
          "task",
          "system",
          driverId,
          "User"
        );
      } catch (err) {
        console.error(`Error processing offline expiry for driver ${driverId}:`, err);
      }
    }

    // Dispatch timer expiration → cascade to next driver
    if (message.startsWith("dispatch:timer:")) {
      const bookingId = message.replace("dispatch:timer:", "");

      // Acquire cascade lock — competing with in-memory setTimeout path
      const cascadeLockKey = `cascade:lock:${bookingId}`;
      let lockAcquired = false;
      try {
        const result = await redisPub.set(cascadeLockKey, "1", "EX", 30, "NX");
        lockAcquired = result === "OK";
      } catch {
        lockAcquired = true; // Redis down — proceed to avoid silent failure
      }

      if (!lockAcquired) {
        console.log(`[RedisDispatch] Cascade already handled by in-memory timer for ${bookingId}. Skipping.`);
        return;
      }

      // Clear in-memory timer if it hasn't fired yet (Redis got here first)
      if (activeTimers.has(bookingId)) {
        clearTimeout(activeTimers.get(bookingId)!);
        activeTimers.delete(bookingId);
      }

      console.log(`[RedisDispatch] dispatch:timer:${bookingId} expired via Redis keyspace. Triggering cascade...`);
      try {
        const nextBaseUrl = process.env.NEXT_BASE_URL || "http://localhost:3000";
        const cascadeSecret = process.env.CASCADE_INTERNAL_SECRET;
        const driverIdRaw = await redisPub.get(`dispatch:driver:${bookingId}`);
        await axios.post(
          `${nextBaseUrl.replace(/\/+$/, "")}/api/booking/${bookingId}/cascade`,
          { driverId: driverIdRaw || undefined },
          {
            timeout: 10000,
            ...(cascadeSecret ? { headers: { "x-cascade-secret": cascadeSecret } } : {}),
          }
        );

        await logSocketEvent(
          "booking_cascade_timeout",
          `Matchmaker response timer expired. Initiating driver cascade.`,
          "info",
          "task",
          "system",
          bookingId,
          "Booking"
        );
      } catch (err: any) {
        console.warn(`[RedisDispatch] Cascade error for booking ${bookingId}:`, err.message);
      } finally {
        // Clean up companion key
        await redisPub.del(`dispatch:driver:${bookingId}`).catch(() => {});
      }
    }
  });
}
