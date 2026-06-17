"use client";

import { getSocket } from "@/lib/socket";
import { PARTNER_GEO_PUSH_INTERVAL_MS } from "@/lib/matching/config";
import React, { useEffect, useRef } from "react";
import { useSharedLocation } from "@/hooks/useSharedLocation";

function GeoUpdater({ userId }: { userId: string | undefined }) {
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);
  const lastSentRef = useRef<number>(0);
  const { position } = useSharedLocation();

  useEffect(() => {
    if (!userId) return;

    socketRef.current = getSocket();

    const identify = () => {
      socketRef.current?.emit("identity", userId);
      socketRef.current?.emit("partner-availability", { available: true });
    };

    identify();
    socketRef.current.on("connect", identify);

    return () => {
      socketRef.current?.emit("partner-availability", { available: false });
      socketRef.current?.off("connect", identify);
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || !position) return;
    const now = Date.now();

    if (now - lastSentRef.current < PARTNER_GEO_PUSH_INTERVAL_MS) return;
    lastSentRef.current = now;

    socketRef.current?.emit("update-location", {
      userId,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    });
  }, [userId, position]);

  return null;
}

export default GeoUpdater;
