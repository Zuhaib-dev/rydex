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
      if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
        console.log("Dev Mode: Proactively emitting mock location (Chanapora, Srinagar)");
        socketRef.current?.emit("update-location", {
          userId,
          latitude: 34.0298,
          longitude: 74.8052,
        });
      }
    };

    identify();
    socketRef.current.on("connect", identify);

    let fallbackInterval: NodeJS.Timeout | null = null;

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
        console.warn("Location tracking unavailable:", err.message);
        if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
          const sendMock = () => {
            console.log("Using local mock location fallback (Chanapora, Srinagar)");
            socketRef.current?.emit("update-location", {
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
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
      }
    );

    return () => {
      if (fallbackInterval) clearInterval(fallbackInterval);
      socketRef.current?.emit("partner-availability", { available: false });
      socketRef.current?.off("connect", identify);
      navigator.geolocation.clearWatch(watcher);
    };
  }, [userId]);

  return null;
}

export default GeoUpdater;
