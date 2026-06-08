"use client";

import { useEffect, useRef } from "react";
import { getSocket } from "@/lib/socket";
import {
  mergeBookingPatch,
  type BookingClientPayload,
} from "@/lib/bookingRealtime";

export type RealtimeToast = {
  message: string;
  type?: "info" | "success" | "error";
};

type UseBookingRealtimeOptions<T extends object> = {
  bookingId?: string;
  enabled?: boolean;
  setBooking: React.Dispatch<React.SetStateAction<T | null>>;
  /** Called when status changes (for redirects) */
  onStatusChange?: (status: string, bookingId: string, patch: BookingClientPayload) => void;
  onToast?: (toast: RealtimeToast) => void;
  /** Role-aware OTP notifications */
  role?: "user" | "partner";
  /** Any booking patch (match radius, search message, etc.) */
  onPatch?: (patch: BookingClientPayload) => void;
  /** Callback triggered on socket connection or window focus to fetch fresh state */
  onReconnect?: () => void;
};

export function useBookingRealtime<T extends object>({
  bookingId,
  enabled = true,
  setBooking,
  onStatusChange,
  onToast,
  onPatch,
  role = "user",
  onReconnect,
}: UseBookingRealtimeOptions<T>) {
  const lastEventIdRef = useRef<string | null>(null);
  const prevStatusRef = useRef<string | undefined>(undefined);
  const prevPickupOtpRef = useRef<string | undefined>(undefined);
  const prevDropOtpRef = useRef<string | undefined>(undefined);

  const onStatusRef = useRef(onStatusChange);
  const onToastRef = useRef(onToast);
  const onPatchRef = useRef(onPatch);
  const onReconnectRef = useRef(onReconnect);

  useEffect(() => {
    onStatusRef.current = onStatusChange;
    onToastRef.current = onToast;
    onPatchRef.current = onPatch;
    onReconnectRef.current = onReconnect;
  }, [onStatusChange, onToast, onPatch, onReconnect]);

  useEffect(() => {
    if (!bookingId || !enabled) return;

    const socket = getSocket();

    const joinRoom = () => {
      socket.emit("join-booking", bookingId);
    };

    const applyPatch = (raw: BookingClientPayload) => {
      if (!raw?.bookingId || String(raw.bookingId) !== String(bookingId)) return;

      if (raw.eventId && raw.eventId === lastEventIdRef.current) return;
      if (raw.eventId) lastEventIdRef.current = raw.eventId;

      const pickupOtp = raw.pickupOtp;
      const dropOtp = raw.dropOtp;

      if (role === "user") {
        if (pickupOtp && pickupOtp !== prevPickupOtpRef.current) {
          onToastRef.current?.({
            message: "Pickup OTP received — share with your driver",
            type: "success",
          });
        }
        if (dropOtp && dropOtp !== prevDropOtpRef.current) {
          onToastRef.current?.({
            message: "Drop OTP received — share at destination",
            type: "success",
          });
        }
      }

      if (role === "partner") {
        if (pickupOtp && pickupOtp !== prevPickupOtpRef.current) {
          onToastRef.current?.({
            message: "Pickup OTP sent to rider",
            type: "info",
          });
        }
        if (dropOtp && dropOtp !== prevDropOtpRef.current) {
          onToastRef.current?.({
            message: "Drop OTP sent to rider",
            type: "info",
          });
        }
      }

      prevPickupOtpRef.current = pickupOtp;
      prevDropOtpRef.current = dropOtp;

      setBooking((prev) => mergeBookingPatch(prev, raw) as T);
      onPatchRef.current?.(raw);

      if (raw.status && raw.status !== prevStatusRef.current) {
        prevStatusRef.current = raw.status;
        onStatusRef.current?.(raw.status, bookingId, raw);
      }
    };

    const onUpdated = (data: BookingClientPayload) => applyPatch(data);
    const onSync = (data: BookingClientPayload) => applyPatch(data);

    const handleConnect = () => {
      joinRoom();
      onReconnectRef.current?.();
    };

    const handleFocus = () => {
      onReconnectRef.current?.();
    };

    if (socket.connected) {
      handleConnect();
    }

    socket.on("connect", handleConnect);
    socket.on("booking-updated", onUpdated);
    socket.on("booking-sync", onSync);

    window.addEventListener("focus", handleFocus);

    return () => {
      socket.emit("leave-booking", bookingId);
      socket.off("connect", handleConnect);
      socket.off("booking-updated", onUpdated);
      socket.off("booking-sync", onSync);
      window.removeEventListener("focus", handleFocus);
    };
  }, [bookingId, enabled, role, setBooking]);
}
