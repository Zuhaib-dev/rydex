"use client";

import { useEffect, useState } from "react";
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
};

/** GPS + connection only. Booking state sync lives in useBookingRealtime. */
export function useRideSocket({
  bookingId,
  enabled = true,
  initialDriverLocation,
}: UseRideSocketOptions) {
  const [latestLocation, setLatestLocation] = useState<{
    bookingId: string;
    position: LatLng;
    at: number;
    speedKmh?: number;
    heading?: number;
  } | null>(null);
  const currentLocation = latestLocation?.bookingId === bookingId ? latestLocation : null;
  const driverPosition = currentLocation?.position ?? initialDriverLocation ?? null;
  const [connectionStatus, setConnectionStatus] =
    useState<RideSocketStatus>("connecting");
  const lastLocationAt = currentLocation?.at ?? null;
  const driverSpeedKmh = currentLocation?.speedKmh ?? 0;
  const driverHeading = currentLocation?.heading ?? null;
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (!bookingId || !enabled) return;

    const socket = getSocket();

    const handleConnect = () => {
      setConnectionStatus("connected");
    };
    const handleDisconnect = () => setConnectionStatus("disconnected");
    const handleReconnect = () => setConnectionStatus("reconnecting");

    const handleDriverLocation = (data: {
      bookingId?: string;
      latitude?: number;
      longitude?: number;
      speedKmh?: number;
      heading?: number | null;
      at?: number;
    }) => {
      if (data.bookingId && String(data.bookingId) !== String(bookingId)) return;
      if (
        Number.isFinite(data.latitude) &&
        Number.isFinite(data.longitude) &&
        Math.abs(data.latitude!) <= 90 &&
        Math.abs(data.longitude!) <= 180
      ) {
        const heading = typeof data.heading === "number" && Number.isFinite(data.heading)
          ? ((data.heading % 360) + 360) % 360
          : undefined;
        setLatestLocation((previous) => {
          const previousForBooking = previous?.bookingId === bookingId ? previous : null;
          const speedKmh = typeof data.speedKmh === "number" && Number.isFinite(data.speedKmh)
            ? Math.max(0, Math.min(160, data.speedKmh))
            : previousForBooking?.speedKmh;
          return {
            bookingId,
            position: [data.latitude!, data.longitude!],
            at: typeof data.at === "number" ? data.at : Date.now(),
            ...(speedKmh !== undefined ? { speedKmh } : {}),
            ...(heading !== undefined ? { heading } : previousForBooking?.heading !== undefined
              ? { heading: previousForBooking.heading }
              : {}),
          };
        });
      }
    };

    if (socket.connected) {
      handleConnect();
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("reconnect_attempt", handleReconnect);
    socket.on("connect_error", handleReconnect);
    socket.on("driver-location", handleDriverLocation);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("reconnect_attempt", handleReconnect);
      socket.off("connect_error", handleReconnect);
      socket.off("driver-location", handleDriverLocation);
    };
  }, [bookingId, enabled]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(interval);
  }, []);

  const isLive = connectionStatus === "connected" && lastLocationAt !== null && now - lastLocationAt < 20_000;

  return {
    driverPosition,
    connectionStatus,
    lastLocationAt,
    driverSpeedKmh: isLive ? driverSpeedKmh : 0,
    driverHeading,
    isLive,
  };
}
