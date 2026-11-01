"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { mutate } from "swr";
import { triggerHapticFeedback, playNotificationSound } from "@/lib/chatEffects";
import { getSocket } from "@/lib/socket";
import { PARTNER_GEO_PUSH_INTERVAL_MS } from "@/lib/matching/config";
import { useSharedLocation } from "@/hooks/useSharedLocation";

/**
 * Keeps partner GPS + availability synced on every partner route.
 * Mount via app/partner/layout.tsx (not only the home dashboard).
 */
export default function PartnerLiveTracker() {
  const { data: session, status } = useSession();
  const lastLocationSentAtRef = useRef(0);
  const lastLocationTimestampRef = useRef(0);
  const { position, error } = useSharedLocation();

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;

    const socket = getSocket();
    const userId = session.user.id;

    const identify = () => {
      socket.emit("identity", userId);
      socket.emit("partner-availability", { available: true });
      socket.emit("partner-heartbeat");
    };

    identify();
    socket.on("connect", identify);

    const handleAdminAction = (data: { action: string }) => {
      if (data.action === "ping") {
        playNotificationSound("request");
        triggerHapticFeedback();
        toast.custom(
          (t) => (
            <div className={`bg-blue-600 text-white px-6 py-4 shadow-xl rounded-2xl flex items-center gap-3 ${t.visible ? 'animate-enter' : 'animate-leave'}`}>
              <span className="text-2xl">📡</span>
              <div>
                <p className="font-bold text-sm">Tower Ping</p>
                <p className="text-xs opacity-90">Admin is requesting your attention.</p>
              </div>
            </div>
          ),
          { duration: 8000 }
        );
      } else if (data.action === "logout") {
        signOut({ callbackUrl: "/auth/signin" });
      }
    };

    socket.on("admin-action", handleAdminAction);

    const handleNewBooking = () => {
      // The partner is notified immediately by Socket.IO; revalidate both the
      // navigation badge and the open request list without waiting for polling.
      void mutate("/api/partner/bookings/pending");
    };
    socket.on("new-booking", handleNewBooking);

    const heartbeat = setInterval(() => {
      if (socket.connected) socket.emit("partner-heartbeat");
    }, 15_000);

    return () => {
      clearInterval(heartbeat);
      socket.off("connect", identify);
      socket.off("admin-action", handleAdminAction);
      socket.off("new-booking", handleNewBooking);
    };
  }, [session?.user?.id, status]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id || !position) return;

    const fixTimestamp = position.timestamp || Date.now();
    const fixAgeMs = Date.now() - fixTimestamp;
    if (
      fixTimestamp <= lastLocationTimestampRef.current ||
      fixAgeMs < -5_000 ||
      fixAgeMs > 20_000 ||
      Date.now() - lastLocationSentAtRef.current < PARTNER_GEO_PUSH_INTERVAL_MS
    ) {
      return;
    }

    const socket = getSocket();
    if (!socket.connected) return;

    socket.emit("update-location", {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      speedKmh: typeof position.coords.speed === "number" ? position.coords.speed * 3.6 : undefined,
      heading: position.coords.heading,
      at: fixTimestamp,
    });
    lastLocationTimestampRef.current = fixTimestamp;
    lastLocationSentAtRef.current = Date.now();
  }, [position, session?.user?.id, status]);

  useEffect(() => {
    if (error && error.code !== error.POSITION_UNAVAILABLE) {
      console.warn("Partner location unavailable:", error.message);
    }
  }, [error]);

  return null;
}
