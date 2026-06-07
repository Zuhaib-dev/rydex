"use client";

import { useEffect, useState } from "react";

export type ClientBookingSnapshot = {
  pickupAddress: string;
  dropAddress: string;
  pickupLocation: { type: "Point"; coordinates: [number, number] };
  dropLocation: { type: "Point"; coordinates: [number, number] };
  tripDistanceKm: number;
  durationMinutes: number;
  fare: number;
  originalFare?: number;
  promoCode?: string;
  discount?: number;
  vehicleType: string;
  routePolyline: GeoJSON.LineString;
  pricingSnapshot: {
    baseFare: number;
    perKmRate: number;
    vehicleType: string;
    vehicleId: string;
    pricingVersion: string;
    surgeMultiplier?: number;
  };
  passengers?: number;
  notes?: string;
  scheduledAt?: string;
  surgeMultiplier?: number;
};

export function useBookingSnapshot(quoteId: string | null) {
  const [snapshot, setSnapshot] = useState<ClientBookingSnapshot | null>(null);
  const [loading, setLoading] = useState(Boolean(quoteId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!quoteId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/booking/quote/${quoteId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load quote");
        if (!cancelled) setSnapshot(data.snapshot);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load quote");
          setSnapshot(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [quoteId]);

  return { snapshot, loading, error };
}
