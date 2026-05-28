"use client";

import { getSocket } from "@/lib/socket";
import { PARTNER_GEO_PUSH_INTERVAL_MS } from "@/lib/matching/config";
import React, { useEffect, useRef } from "react";

function GeoUpdater({ userId }: { userId: string | undefined }) {
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);
  const lastSentRef = useRef<number>(0);

  useEffect(() => {
    if (!userId) return;
    if (!navigator.geolocation) return;

    socketRef.current = getSocket();

    const identify = () => {
      socketRef.current?.emit("identity", userId);
      socketRef.current?.emit("partner-availability", { available: true });
    };

    identify();
    socketRef.current.on("connect", identify);

    const watcher = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();

        if (now - lastSentRef.current < PARTNER_GEO_PUSH_INTERVAL_MS) return;

        lastSentRef.current = now;

        socketRef.current?.emit("update-location", {
          userId,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      (err) => {
        if (err.code !== err.POSITION_UNAVAILABLE) {
          console.warn("Location tracking unavailable:", err.message);
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
      }
    );

    return () => {
      socketRef.current?.emit("partner-availability", { available: false });
      socketRef.current?.off("connect", identify);
      navigator.geolocation.clearWatch(watcher);
    };
  }, [userId]);

  return null;
}

export default GeoUpdater;
