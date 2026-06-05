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
      if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
        console.log("Dev Mode: Proactively emitting mock location (Chanapora, Srinagar)");
        socket.emit("update-location", {
          userId,
          latitude: 34.0298,
          longitude: 74.8052,
        });
      }
    };

    identify();
    socket.on("connect", identify);

    let fallbackInterval: NodeJS.Timeout | null = null;

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
        console.warn("Partner location unavailable:", err.message);
        if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
          const sendMock = () => {
            console.log("Using local mock location fallback (Chanapora, Srinagar)");
            socket.emit("update-location", {
              userId,
              latitude: 34.0298,
              longitude: 74.8052,
            });
          };

          sendMock();

          if (!fallbackInterval) {
            fallbackInterval = setInterval(sendMock, PARTNER_GEO_PUSH_INTERVAL_MS);
          }
        }
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 12000 },
    );

    return () => {
      if (fallbackInterval) clearInterval(fallbackInterval);
      socket.emit("partner-availability", { available: false });
      socket.off("connect", identify);
      navigator.geolocation.clearWatch(watcher);
    };
  }, [session?.user?.id, status]);

  return null;
}
