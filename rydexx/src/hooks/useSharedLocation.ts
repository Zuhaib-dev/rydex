"use client";

import { useEffect, useRef, useState } from "react";

type Listener = (pos: GeolocationPosition) => void;
type ErrorListener = (err: GeolocationPositionError) => void;

let watchId: number | null = null;
let pollingInterval: ReturnType<typeof setInterval> | null = null;
let lastKnownPosition: GeolocationPosition | null = null;
let lastPositionAt = 0;
const listeners: Listener[] = [];
const errorListeners: ErrorListener[] = [];

function publishPosition(pos: GeolocationPosition) {
  lastKnownPosition = pos;
  lastPositionAt = Date.now();
  listeners.forEach((listener) => listener(pos));
}

export function subscribeToLocation(onNext: Listener, onError?: ErrorListener) {
  if (typeof window === "undefined" || !navigator.geolocation) return () => {};

  listeners.push(onNext);
  if (onError) errorListeners.push(onError);
  if (lastKnownPosition) onNext(lastKnownPosition);

  if (watchId === null) {
    watchId = navigator.geolocation.watchPosition(
      publishPosition,
      (err) => errorListeners.forEach((listener) => listener(err)),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
    );

    // Only poll if watchPosition has gone quiet. Running both continuously
    // causes duplicate high-accuracy fixes and wastes battery on mobile.
    pollingInterval = setInterval(() => {
      if (Date.now() - lastPositionAt < 15000) return;
      navigator.geolocation.getCurrentPosition(
        publishPosition,
        (err) => errorListeners.forEach((listener) => listener(err)),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 8000 },
      );
    }, 15000);
  }

  return () => {
    const listenerIndex = listeners.indexOf(onNext);
    if (listenerIndex >= 0) listeners.splice(listenerIndex, 1);

    if (onError) {
      const errorIndex = errorListeners.indexOf(onError);
      if (errorIndex >= 0) errorListeners.splice(errorIndex, 1);
    }

    if (listeners.length === 0 && watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      if (pollingInterval) clearInterval(pollingInterval);
      watchId = null;
      pollingInterval = null;
      lastKnownPosition = null;
      lastPositionAt = 0;
    }
  };
}

function distanceMeters(a: GeolocationPosition, b: GeolocationPosition) {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusMeters = 6_371_000;
  const lat1 = radians(a.coords.latitude);
  const lat2 = radians(b.coords.latitude);
  const dLat = lat2 - lat1;
  const dLng = radians(b.coords.longitude - a.coords.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function bearingDegrees(a: GeolocationPosition, b: GeolocationPosition) {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const lat1 = radians(a.coords.latitude);
  const lat2 = radians(b.coords.latitude);
  const dLng = radians(b.coords.longitude - a.coords.longitude);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

export function useSharedLocation() {
  const [position, setPosition] = useState<GeolocationPosition | null>(lastKnownPosition);
  const [error, setError] = useState<GeolocationPositionError | null>(null);
  const [speedKmh, setSpeedKmh] = useState(0);
  const [headingDegreesValue, setHeadingDegreesValue] = useState<number | null>(null);
  const previousPositionRef = useRef<GeolocationPosition | null>(null);
  const speedRef = useRef(0);

  useEffect(() => {
    const unsubscribe = subscribeToLocation(
      (next) => {
        setPosition(next);

        const previous = previousPositionRef.current;
        const timestamp = next.timestamp || Date.now();
        const previousTimestamp = previous?.timestamp || 0;
        if (previous && timestamp <= previousTimestamp) return;

        const nativeSpeed = next.coords.speed;
        let measuredSpeed = typeof nativeSpeed === "number" && Number.isFinite(nativeSpeed)
          ? nativeSpeed * 3.6
          : null;
        let movedMeters = 0;

        if (previous) {
          const elapsedSeconds = (timestamp - previousTimestamp) / 1000;
          movedMeters = distanceMeters(previous, next);
          if (measuredSpeed === null && elapsedSeconds > 0) {
            const accuracyAllowance = Math.min(
              20,
              (Number.isFinite(previous.coords.accuracy) ? previous.coords.accuracy : 0) / 2 +
                (Number.isFinite(next.coords.accuracy) ? next.coords.accuracy : 0) / 2,
            );
            measuredSpeed = Math.max(0, movedMeters - accuracyAllowance) / elapsedSeconds * 3.6;
          }
        }

        if (measuredSpeed !== null && Number.isFinite(measuredSpeed)) {
          const boundedSpeed = Math.min(160, Math.max(0, measuredSpeed));
          const filteredSpeed = boundedSpeed < 2 ? 0 : speedRef.current + (boundedSpeed - speedRef.current) * 0.4;
          speedRef.current = filteredSpeed;
          setSpeedKmh(filteredSpeed);
        }

        if (typeof next.coords.heading === "number" && Number.isFinite(next.coords.heading) && speedRef.current > 2) {
          setHeadingDegreesValue(next.coords.heading);
        } else if (previous && movedMeters > 4 && speedRef.current > 2) {
          setHeadingDegreesValue(bearingDegrees(previous, next));
        }

        previousPositionRef.current = next;
      },
      setError,
    );
    return () => unsubscribe();
  }, []);

  return { position, error, speedKmh, headingDegrees: headingDegreesValue };
}
