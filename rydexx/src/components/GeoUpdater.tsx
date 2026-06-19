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

  const posRef = useRef(position);
  useEffect(() => {
    posRef.current = position;
  }, [position]);

  useEffect(() => {
    if (!userId) return;

    // Send heartbeat immediately on mount if we have a position
    if (posRef.current) {
      socketRef.current?.emit("update-location", {
        userId,
        latitude: posRef.current.coords.latitude,
        longitude: posRef.current.coords.longitude,
      });
    }

    // Set interval to send heartbeats continuously even if position doesn't change
    const interval = setInterval(() => {
      const pos = posRef.current;
      if (!pos) return;
      socketRef.current?.emit("update-location", {
        userId,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
    }, PARTNER_GEO_PUSH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [userId]);

  return null;
}

export default GeoUpdater;
