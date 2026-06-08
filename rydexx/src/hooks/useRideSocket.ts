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
  initialDriverLocation?: LatLng | null;
  driverId?: string;
  status?: string;
};

/** GPS + connection only. Booking state sync lives in useBookingRealtime. */
export function useRideSocket({
  bookingId,
  enabled = true,
  initialDriverLocation,
  driverId,
  status,
}: UseRideSocketOptions) {
  const [driverPosition, setDriverPosition] = useState<LatLng | null>(
    initialDriverLocation ?? null
  );

  useEffect(() => {
    if (initialDriverLocation && !driverPosition) {
      setDriverPosition(initialDriverLocation);
    }
  }, [initialDriverLocation, driverPosition]);
  const [connectionStatus, setConnectionStatus] =
    useState<RideSocketStatus>("connecting");
  const [lastLocationAt, setLastLocationAt] = useState<number | null>(null);

  const clearDriver = useCallback(() => setDriverPosition(null), []);

  useEffect(() => {
    if (!bookingId || !enabled) return;

    const socket = getSocket();

    const joinRoom = () => {
      socket.emit("join-booking", bookingId);
    };

    const handleConnect = () => {
      setConnectionStatus("connected");
      joinRoom();
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

    if (socket.connected) {
      handleConnect();
    }

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

  /* ── Passenger GPS proxy when ride has started ── */
  useEffect(() => {
    if (!bookingId || !enabled || status !== "started" || !driverId) return;
    if (typeof window === "undefined" || !navigator.geolocation) return;

    const socket = getSocket();

    const handlePassengerPosition = (pos: GeolocationPosition) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      // Update state locally so the passenger map updates smoothly
      setDriverPosition([lat, lng]);
      setLastLocationAt(Date.now());

      // Send passenger location as proxy for driver location to server & other clients
      socket.emit("driver-location-update", {
        bookingId,
        driverId,
        latitude: lat,
        longitude: lng,
        status: "started",
      });
    };

    // Watch position
    const watchId = navigator.geolocation.watchPosition(
      handlePassengerPosition,
      (err) => {
        console.warn("Passenger GPS proxy watch error:", err.code, err.message);
      },
      { enableHighAccuracy: true, maximumAge: 5000 }
    );

    // Fallback polling (getCurrentPosition) every 8 seconds
    const pollingInterval = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        handlePassengerPosition,
        (err) => {
          console.warn("Passenger GPS proxy polling error:", err.code, err.message);
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 5000 }
      );
    }, 8000);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearInterval(pollingInterval);
    };
  }, [bookingId, enabled, status, driverId]);

  return {
    driverPosition,
    setDriverPosition,
    clearDriver,
    connectionStatus,
    lastLocationAt,
    isLive: connectionStatus === "connected" && lastLocationAt !== null,
  };
}
