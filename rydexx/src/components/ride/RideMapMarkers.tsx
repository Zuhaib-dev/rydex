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
        className="absolute -top-14 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-2xl border border-white/10 bg-zinc-950/90 px-3.5 py-1.5 text-[11px] font-medium tracking-wide text-white shadow-[0_0_20px_rgba(16,185,129,0.15)] backdrop-blur-xl z-50"
      >
        <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse align-middle" />
        {label} <span className="text-zinc-600 mx-1.5">|</span> <span className="text-emerald-400 font-bold">{etaLabel}</span>
      </motion.div>

      <div
        className="relative"
        style={{ 
          transform: `rotate(${bearing}deg)`,
          transition: "transform 2s cubic-bezier(0.2, 0.8, 0.2, 1)"
        }}
      >
        {/* Glow rings */}
        <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl scale-[2.5]" />
        <div className="absolute inset-0 rounded-full border border-emerald-500/30 scale-[1.7] animate-ping" style={{ animationDuration: '3s' }} />
        
        {/* Sleek Vehicle SVG */}
        <svg width="48" height="48" viewBox="0 0 100 100" className="drop-shadow-[0_0_15px_rgba(16,185,129,0.5)] relative z-10">
          {/* Shadow */}
          <ellipse cx="50" cy="55" rx="18" ry="30" fill="rgba(0,0,0,0.4)" filter="blur(4px)" />
          {/* Car Body Base */}
          <rect x="36" y="20" width="28" height="60" rx="10" fill="#09090b" stroke="#10b981" strokeWidth="1.5" />
          {/* Windshield */}
          <path d="M40 40 L60 40 L56 30 L44 30 Z" fill="#18181b" stroke="#059669" strokeWidth="1" />
          {/* Rear Window */}
          <path d="M40 60 L60 60 L56 70 L44 70 Z" fill="#18181b" />
          {/* Headlights */}
          <circle cx="41" cy="23" r="2.5" fill="#34d399" filter="drop-shadow(0 0 5px #34d399)" />
          <circle cx="59" cy="23" r="2.5" fill="#34d399" filter="drop-shadow(0 0 5px #34d399)" />
          {/* Taillights */}
          <rect x="39" y="76" width="6" height="2" rx="1" fill="#ef4444" />
          <rect x="55" y="76" width="6" height="2" rx="1" fill="#ef4444" />
          {/* Roof */}
          <rect x="42" y="42" width="16" height="16" rx="4" fill="#18181b" />
        </svg>
      </div>
    </div>
  );
}
