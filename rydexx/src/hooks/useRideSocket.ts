"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket";
import type { LatLng } from "@/lib/mapboxRouting";

export type RideSocketStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected";

type BookingPatch = Record<string, unknown> & { bookingId?: string };

type UseRideSocketOptions = {
  bookingId: string | undefined;
  enabled?: boolean;
  onBookingUpdate?: (patch: BookingPatch) => void;
  onDriverAssigned?: (data: Record<string, unknown>) => void;
};

export function useRideSocket({
  bookingId,
  enabled = true,
  onBookingUpdate,
  onDriverAssigned,
}: UseRideSocketOptions) {
  const [driverPosition, setDriverPosition] = useState<LatLng | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<RideSocketStatus>("connecting");
  const [lastLocationAt, setLastLocationAt] = useState<number | null>(null);

  const onBookingUpdateRef = useRef(onBookingUpdate);
  const onDriverAssignedRef = useRef(onDriverAssigned);
  onBookingUpdateRef.current = onBookingUpdate;
  onDriverAssignedRef.current = onDriverAssigned;

  const clearDriver = useCallback(() => setDriverPosition(null), []);

  useEffect(() => {
    if (!bookingId || !enabled) return;

    const socket = getSocket();

    const handleConnect = () => {
      setConnectionStatus("connected");
      socket.emit("join-booking", bookingId);
    };

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

    const handleBookingUpdated = (data: BookingPatch) => {
      if (data.bookingId && String(data.bookingId) !== String(bookingId)) return;
      onBookingUpdateRef.current?.(data);
    };

    const handleDriverAssigned = (data: Record<string, unknown>) => {
      onDriverAssignedRef.current?.(data);
    };

    if (socket.connected) handleConnect();
    else setConnectionStatus("connecting");

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("reconnect_attempt", handleReconnect);
    socket.on("driver-location", handleDriverLocation);
    socket.on("booking-updated", handleBookingUpdated);
    socket.on("driver-assigned", handleDriverAssigned);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("reconnect_attempt", handleReconnect);
      socket.off("driver-location", handleDriverLocation);
      socket.off("booking-updated", handleBookingUpdated);
      socket.off("driver-assigned", handleDriverAssigned);
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
