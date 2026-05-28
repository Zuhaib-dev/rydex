"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket";
import type { LatLng } from "@/lib/mapboxRouting";

export type RideSocketStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected";

type UseRideSocketOptions = {
  bookingId: string | undefined;
  enabled?: boolean;
};

/** GPS + connection only. Booking state sync lives in useBookingRealtime. */
export function useRideSocket({ bookingId, enabled = true }: UseRideSocketOptions) {
  const [driverPosition, setDriverPosition] = useState<LatLng | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<RideSocketStatus>("connecting");
  const [lastLocationAt, setLastLocationAt] = useState<number | null>(null);

  const clearDriver = useCallback(() => setDriverPosition(null), []);

  useEffect(() => {
    if (!bookingId || !enabled) return;

    const socket = getSocket();

    const handleConnect = () => setConnectionStatus("connected");
    const handleDisconnect = () => setConnectionStatus("disconnected");
    const handleReconnect = () => setConnectionStatus("reconnecting");

    const handleDriverLocation = (data: {
      latitude?: number;
      longitude?: number;
    }) => {
      if (
        typeof data.latitude === "number" &&
        typeof data.longitude === "number"
      ) {
        setDriverPosition([data.latitude, data.longitude]);
        setLastLocationAt(Date.now());
      }
    };

    if (socket.connected) handleConnect();
    else setConnectionStatus("connecting");

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("reconnect_attempt", handleReconnect);
    socket.on("driver-location", handleDriverLocation);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("reconnect_attempt", handleReconnect);
      socket.off("driver-location", handleDriverLocation);
    };
  }, [bookingId, enabled]);

  return {
    driverPosition,
    setDriverPosition,
    clearDriver,
    connectionStatus,
    lastLocationAt,
    isLive: connectionStatus === "connected" && lastLocationAt !== null,
  };
}
