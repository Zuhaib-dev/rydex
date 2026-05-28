"use client";

import { motion } from "motion/react";

export function PickupMarker() {
  return (
    <div className="flex flex-col items-center pointer-events-none">
      <div className="rounded-xl border-2 border-white bg-zinc-950 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white shadow-lg">
        Pickup
      </div>
      <div className="mt-1 h-3 w-0.5 bg-zinc-950" />
      <div className="relative flex h-4 w-4 items-center justify-center">
        <span className="absolute h-8 w-8 rounded-full bg-emerald-400/25 animate-ping" />
        <span className="relative h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 shadow-md" />
      </div>
    </div>
  );
}

export function DropMarker() {
  return (
    <div className="flex flex-col items-center pointer-events-none">
      <div className="rounded-xl border-2 border-zinc-950 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-950 shadow-lg">
        Drop
      </div>
      <div className="mt-1 h-3 w-0.5 bg-white" />
      <div className="h-3.5 w-3.5 rotate-45 border-2 border-zinc-950 bg-white shadow-md" />
    </div>
  );
}

export function DriverMarker({
  bearing,
  etaMinutes,
  label = "Driver",
}: {
  bearing: number;
  etaMinutes: number;
  label?: string;
}) {
  const etaLabel =
    etaMinutes > 0 ? `${Math.ceil(etaMinutes)} min` : "Arriving";

  return (
    <div className="relative flex items-center justify-center pointer-events-none">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="absolute -top-11 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-zinc-200/80 bg-white/95 px-3 py-1 text-[10px] font-bold text-zinc-900 shadow-lg backdrop-blur-md"
      >
        <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 align-middle" />
        {label} · {etaLabel}
      </motion.div>

      <div
        className="relative transition-transform duration-500 ease-out"
        style={{ transform: `rotate(${bearing}deg)` }}
      >
        <div className="absolute inset-0 rounded-full bg-emerald-400/20 blur-md scale-150" />
        <svg width="52" height="52" viewBox="0 0 100 100" className="drop-shadow-xl">
          <ellipse cx="50" cy="54" rx="22" ry="28" fill="rgba(0,0,0,0.25)" />
          <path
            d="M50 12 L62 78 L50 68 L38 78 Z"
            fill="#0a0a0a"
            stroke="#9eff6b"
            strokeWidth="3"
          />
          <circle cx="50" cy="48" r="10" fill="#9eff6b" />
        </svg>
      </div>
    </div>
  );
}
