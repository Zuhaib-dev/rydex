"use client";

import { useEffect, useState, useRef } from "react";

type Listener = (pos: GeolocationPosition) => void;
type ErrorListener = (err: GeolocationPositionError) => void;

let watchId: number | null = null;
let pollingInterval: NodeJS.Timeout | null = null;
let lastKnownPosition: GeolocationPosition | null = null;
const listeners: Listener[] = [];
const errorListeners: ErrorListener[] = [];

export function subscribeToLocation(onNext: Listener, onError?: ErrorListener) {
  if (typeof window === "undefined" || !navigator.geolocation) return () => {};

  listeners.push(onNext);
  if (onError) errorListeners.push(onError);

  if (lastKnownPosition) onNext(lastKnownPosition);

  if (watchId === null) {
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        lastKnownPosition = pos;
        listeners.forEach((l) => l(pos));
      },
      (err) => {
        errorListeners.forEach((l) => l(err));
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 12000 }
    );

    // Fallback polling for stubborn mobile browsers (iOS Safari, Android Webviews)
    pollingInterval = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          lastKnownPosition = pos;
          listeners.forEach((l) => l(pos));
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 3000, timeout: 5000 }
      );
    }, 8000);
  }

  return () => {
    const idx = listeners.indexOf(onNext);
    if (idx > -1) listeners.splice(idx, 1);

    if (onError) {
      const errIdx = errorListeners.indexOf(onError);
      if (errIdx > -1) errorListeners.splice(errIdx, 1);
    }

    if (listeners.length === 0 && watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      if (pollingInterval) clearInterval(pollingInterval);
      watchId = null;
      pollingInterval = null;
      lastKnownPosition = null;
    }
  };
}

export function useSharedLocation() {
  const [position, setPosition] = useState<GeolocationPosition | null>(lastKnownPosition);
  const [error, setError] = useState<GeolocationPositionError | null>(null);
  const [speedKmh, setSpeedKmh] = useState<number>(0);
  const lastPosRef = useState<GeolocationPosition | null>(lastKnownPosition)[0]; // Actually, use a ref
  const prevRef = useRef<{ pos: GeolocationPosition, time: number } | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToLocation(
      (pos) => {
        setPosition(pos);
        
        // Native speed is in meters/second
        if (pos.coords.speed !== null && pos.coords.speed >= 0) {
          setSpeedKmh(pos.coords.speed * 3.6);
        } else {
          // Manual calculation
          const now = Date.now();
          if (prevRef.current) {
            // Lazy load distanceMeters to avoid top-level import issues if not needed, or import it.
            // Let's just do a rough Haversine here or use the imported one.
            import("@/lib/mapboxRouting").then(({ distanceMeters }) => {
              const dist = distanceMeters(
                [prevRef.current!.pos.coords.latitude, prevRef.current!.pos.coords.longitude],
                [pos.coords.latitude, pos.coords.longitude]
              );
              const timeSeconds = (now - prevRef.current!.time) / 1000;
              if (timeSeconds > 0) {
                const calculatedMps = dist / timeSeconds;
                setSpeedKmh(calculatedMps * 3.6);
              }
            });
          }
          prevRef.current = { pos, time: now };
        }
      },
      (err) => setError(err)
    );
    return () => unsubscribe();
  }, []);

  return { position, error, speedKmh };
}
