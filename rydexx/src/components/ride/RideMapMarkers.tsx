"use client";

import { motion } from "motion/react";
import Image from "next/image";

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

/** Small, top-down vehicle silhouettes shared by rider and dispatch maps. */
export function VehicleGlyph({
  vehicleType = "car",
  color = "#10b981",
  size = 48,
}: {
  vehicleType?: string;
  color?: string;
  size?: number;
}) {
  const type = vehicleType.toLowerCase();
  const common = { fill: "#09090b", stroke: color, strokeWidth: 3, strokeLinejoin: "round" as const };

  if (type === "bike") {
    return (
      <Image
        src="/markers/motorcycle-topdown.webp"
        alt=""
        aria-hidden="true"
        width={Math.round(size * 0.87)}
        height={Math.round(size * 1.72)}
        draggable={false}
        className="pointer-events-none object-contain drop-shadow-[0_2px_5px_rgba(0,0,0,0.65)]"
      />
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className="drop-shadow-[0_0_10px_rgba(0,0,0,0.55)]">
      {type === "auto" ? (
        <g {...common}>
          <path d="M50 10 65 21l9 18v36L60 88H40L26 75V39l9-18z" />
          <path d="M38 25h24l7 15H31z" fill="#27272a" />
          <path d="M33 46h34v19H33z" fill="#064e3b" />
          <path d="M38 70h24l-5 10H43z" fill="#18181b" />
          <circle cx="29" cy="68" r="5" fill="#18181b" stroke={color} strokeWidth="2" />
          <circle cx="71" cy="68" r="5" fill="#18181b" stroke={color} strokeWidth="2" />
          <path d="M42 15h16" stroke={color} strokeWidth="4" />
        </g>
      ) : type === "truck" || type === "loading" ? (
        <g {...common}>
          <path d="M30 8h40v48H30z" />
          <path d="M34 14h32v25H34z" fill="#27272a" />
          <path d="M34 44h32v8H34z" fill="#064e3b" />
          <path d="M34 58h32l-5 26H39z" fill="#18181b" />
          <circle cx="35" cy="78" r="5" fill="#09090b" stroke={color} strokeWidth="2" />
          <circle cx="65" cy="78" r="5" fill="#09090b" stroke={color} strokeWidth="2" />
          <path d="M41 10h18" stroke={color} strokeWidth="4" />
        </g>
      ) : (
        <g {...common}>
          <path d="M34 12h32q9 4 10 16v44q-2 15-12 17H36q-10-2-12-17V28q1-12 10-16z" />
          <path d="m32 30 5-11h26l5 11v14H32z" fill="#27272a" />
          <path d="M31 49h38v18H31z" fill="#064e3b" />
          <path d="m35 72 5 9h20l5-9z" fill="#27272a" />
          <path d="M29 23 22 19M71 23l7-4" fill="none" stroke={color} strokeWidth="3" />
          <circle cx="34" cy="17" r="3" fill="#fef3c7" stroke="none" />
          <circle cx="66" cy="17" r="3" fill="#fef3c7" stroke="none" />
          <path d="M31 83h9M60 83h9" stroke="#ef4444" strokeWidth="4" />
        </g>
      )}
    </svg>
  );
}

export function DriverMarker({
  bearing,
  etaMinutes,
  label = "Driver",
  vehicleType = "car",
}: {
  bearing: number;
  etaMinutes: number;
  label?: string;
  vehicleType?: string;
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
        style={{ transform: `rotate(${bearing}deg)` }}
      >
        {/* Glow rings */}
        <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl scale-[2.5]" />
        <div className="absolute inset-0 rounded-full border border-emerald-500/30 scale-[1.7] animate-ping" style={{ animationDuration: '3s' }} />
        
        <div className="relative z-10">
          <VehicleGlyph vehicleType={vehicleType} size={48} />
        </div>
      </div>
    </div>
  );
}
