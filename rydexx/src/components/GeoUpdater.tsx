"use client";

import { getSocket } from "@/lib/socket";
import { PARTNER_GEO_PUSH_INTERVAL_MS } from "@/lib/matching/config";
import React, { useEffect, useRef } from "react";
import { useSharedLocation } from "@/hooks/useSharedLocation";

function GeoUpdater({ userId }: { userId: string | undefined }) {
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);
  const lastSentAtRef = useRef(0);
  const lastFixTimestampRef = useRef(0);
  const { position } = useSharedLocation();

  useEffect(() => {
    if (!userId) return;

    socketRef.current = getSocket();

    const identify = () => {
      socketRef.current?.emit("identity", userId);
      socketRef.current?.emit("partner-availability", { available: true });
      socketRef.current?.emit("partner-heartbeat");
    };

    identify();
    socketRef.current.on("connect", identify);
    const heartbeat = setInterval(() => {
      if (socketRef.current?.connected) socketRef.current.emit("partner-heartbeat");
    }, 15_000);

    return () => {
      clearInterval(heartbeat);
      socketRef.current?.off("connect", identify);
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || !position) return;
    const timestamp = position.timestamp || Date.now();
    const age = Date.now() - timestamp;
    if (
      timestamp <= lastFixTimestampRef.current ||
      age < -5_000 || age > 20_000 ||
      Date.now() - lastSentAtRef.current < PARTNER_GEO_PUSH_INTERVAL_MS
    ) return;

    const socket = socketRef.current;
    if (!socket?.connected) return;
    socket.emit("update-location", {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      at: timestamp,
    });
    lastFixTimestampRef.current = timestamp;
    lastSentAtRef.current = Date.now();
  }, [position, userId]);

  return null;
}

export default GeoUpdater;
