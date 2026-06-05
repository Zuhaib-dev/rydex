"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { getSocket } from "@/lib/socket";
import { PARTNER_GEO_PUSH_INTERVAL_MS } from "@/lib/matching/config";

/**
 * Keeps partner GPS + availability synced on every partner route.
 * Mount via app/partner/layout.tsx (not only the home dashboard).
 */
export default function PartnerLiveTracker() {
  const { data: session, status } = useSession();
  const lastSentRef = useRef(0);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;
    if (!navigator.geolocation) return;

    const socket = getSocket();
    const userId = session.user.id;

    const identify = () => {
      socket.emit("identity", userId);
      socket.emit("partner-availability", { available: true });
    };

    identify();
    socket.on("connect", identify);

    const watcher = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastSentRef.current < PARTNER_GEO_PUSH_INTERVAL_MS) return;
        lastSentRef.current = now;

        socket.emit("update-location", {
          userId,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      (err) => {
        if (err.code !== err.POSITION_UNAVAILABLE) {
          console.warn("Partner location unavailable:", err.message);
        }
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 12000 },
    );

    return () => {
      socket.emit("partner-availability", { available: false });
      socket.off("connect", identify);
      navigator.geolocation.clearWatch(watcher);
    };
  }, [session?.user?.id, status]);

  return null;
}
