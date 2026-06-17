"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { getSocket } from "@/lib/socket";
import { PARTNER_GEO_PUSH_INTERVAL_MS } from "@/lib/matching/config";
import { useSharedLocation } from "@/hooks/useSharedLocation";

/**
 * Keeps partner GPS + availability synced on every partner route.
 * Mount via app/partner/layout.tsx (not only the home dashboard).
 */
export default function PartnerLiveTracker() {
  const { data: session, status } = useSession();
  const lastSentRef = useRef(0);
  const { position, error } = useSharedLocation();

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;

    const socket = getSocket();
    const userId = session.user.id;

    const identify = () => {
      socket.emit("identity", userId);
      socket.emit("partner-availability", { available: true });
    };

    identify();
    socket.on("connect", identify);

    return () => {
      socket.emit("partner-availability", { available: false });
      socket.off("connect", identify);
    };
  }, [session?.user?.id, status]);

  useEffect(() => {
    if (!position || status !== "authenticated" || !session?.user?.id) return;
    const now = Date.now();
    if (now - lastSentRef.current < PARTNER_GEO_PUSH_INTERVAL_MS) return;
    lastSentRef.current = now;

    const socket = getSocket();
    socket.emit("update-location", {
      userId: session.user.id,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    });
  }, [position, session?.user?.id, status]);

  useEffect(() => {
    if (error && error.code !== error.POSITION_UNAVAILABLE) {
      console.warn("Partner location unavailable:", error.message);
    }
  }, [error]);

  return null;
}
