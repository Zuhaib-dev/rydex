"use client";

import { useEffect, useRef, useState } from "react";
import type { LatLng } from "@/lib/mapboxRouting";

/**
 * Interpolates GPS updates smoothly (ease-out cubic) instead of jumping markers.
 */
export function useSmoothCoords(
  target: LatLng | null,
  durationMs = 1100,
): LatLng | null {
  const [display, setDisplay] = useState<LatLng | null>(target);
  const displayRef = useRef<LatLng | null>(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    if (!target) {
      displayRef.current = null;
      setDisplay(null);
      return;
    }

    const from = displayRef.current ?? target;
    const to = target;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      const next: LatLng = [
        from[0] + (to[0] - from[0]) * eased,
        from[1] + (to[1] - from[1]) * eased,
      ];
      displayRef.current = next;
      setDisplay(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target?.[0], target?.[1], durationMs]);

  return display;
}
