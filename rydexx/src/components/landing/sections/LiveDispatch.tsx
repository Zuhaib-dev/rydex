"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  ArrowRight,
  Bike,
  Car,
  Truck,
  Package,
  CarTaxiFront,
  MapPin,
  Plus,
  Asterisk,
  Check,
  Stamp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Crosshair } from "./Hero";

/* ───────────────────────── LIVE DISPATCH (map + feed) ───────────────────────── */
type City = { name: string; code: string; x: number; y: number; pulse?: boolean };
const cities: City[] = [
  { name: "Delhi",     code: "DEL", x: 245, y: 165, pulse: true },
  { name: "Mumbai",    code: "BOM", x: 175, y: 320, pulse: true },
  { name: "Bengaluru", code: "BLR", x: 248, y: 430, pulse: true },
  { name: "Hyderabad", code: "HYD", x: 260, y: 380 },
  { name: "Chennai",   code: "MAA", x: 285, y: 460 },
  { name: "Kolkata",   code: "CCU", x: 395, y: 270 },
  { name: "Ahmedabad", code: "AMD", x: 165, y: 250 },
  { name: "Jaipur",    code: "JAI", x: 215, y: 215 },
  { name: "Pune",      code: "PNQ", x: 195, y: 340 },
  { name: "Kochi",     code: "COK", x: 235, y: 490 },
  { name: "Lucknow",   code: "LKO", x: 295, y: 215 },
  { name: "Guwahati",  code: "GAU", x: 445, y: 235 },
];

const feed = [
  { t: "00:00:02", c: "BOM → PNQ", v: "Sedan", f: "₹ 1,840", who: "A. Mehta" },
  { t: "00:00:05", c: "DEL → GGN", v: "Bike",  f: "₹ 64",    who: "R. Singh" },
  { t: "00:00:09", c: "BLR → MAA", v: "Truck", f: "₹ 9,200", who: "Kerala Logs Ltd." },
  { t: "00:00:11", c: "HYD → HYD", v: "Auto",  f: "₹ 110",   who: "S. Reddy" },
  { t: "00:00:14", c: "CCU → CCU", v: "SUV",   f: "₹ 420",   who: "D. Bose" },
  { t: "00:00:17", c: "AMD → BOM", v: "Van",   f: "₹ 4,100", who: "Patel Movers" },
  { t: "00:00:21", c: "JAI → DEL", v: "Sedan", f: "₹ 2,650", who: "M. Sharma" },
  { t: "00:00:24", c: "COK → BLR", v: "Truck", f: "₹ 11,400",who: "Spice Routes Co." },
];

function LiveDispatch() {
  return (
    <section className="relative brick text-bone overflow-hidden">
      <Crosshair className="top-6 left-6 [&>div>div]:bg-bone/40" />
      <Crosshair className="top-6 right-6 [&>div>div]:bg-bone/40" />

      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 py-24">
        <div className="grid lg:grid-cols-12 gap-6 mb-12 items-end">
          <div className="lg:col-span-3 font-mono text-[11px] tracking-[0.25em] uppercase text-bone/60">
            §03 — Live Dispatch
          </div>
          <h2 className="lg:col-span-6 font-serif font-black leading-[0.88] tracking-tighter text-5xl sm:text-7xl">
            The country, <span className="italic font-bold text-signal">in motion</span>.
          </h2>
          <div className="lg:col-span-3 font-mono text-[10px] tracking-[0.2em] uppercase text-bone/60">
            <div className="flex items-center gap-2 mb-1">
              <span className="h-1.5 w-1.5 bg-signal rounded-full animate-blink" />
              streaming · realtime
            </div>
            <div>last refresh: 0.4s ago</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-px bg-bone/15 border border-bone/15">
          {/* MAP */}
          <div className="lg:col-span-8 bg-ink relative aspect-5/6 sm:aspect-7/6 lg:aspect-auto lg:min-h-[600px] p-6">
            <div className="absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage:
                  "linear-gradient(var(--color-bone) 1px, transparent 1px), linear-gradient(90deg, var(--color-bone) 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />

            {/* corner labels */}
            <div className="absolute top-4 left-4 font-mono text-[9px] tracking-[0.25em] uppercase text-bone/50">N 28.61° · INDIA</div>
            <div className="absolute top-4 right-4 font-mono text-[9px] tracking-[0.25em] uppercase text-bone/50">PLATE 03 / DISPATCH</div>
            <div className="absolute bottom-4 left-4 font-mono text-[9px] tracking-[0.25em] uppercase text-bone/50">SCALE — 1 PX / 6 KM</div>
            <div className="absolute bottom-4 right-4 font-mono text-[9px] tracking-[0.25em] uppercase text-bone/50">SRC: rydex.live</div>

            <svg
              viewBox="0 0 600 600"
              className="relative h-full w-full"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* stylised India silhouette — abstract, not geographic */}
              <path
                d="M180 110 L260 95 L335 130 L380 110 L430 145 L455 200 L420 240 L455 290 L430 340 L395 365 L385 415 L335 470 L295 520 L260 510 L235 470 L195 430 L165 380 L150 325 L130 270 L145 215 L165 165 Z"
                fill="none"
                stroke="var(--color-bone)"
                strokeOpacity="0.25"
                strokeWidth="1"
                strokeDasharray="3 5"
              />
              {/* animated trip arcs */}
              <g stroke="var(--color-signal)" strokeWidth="1.2" fill="none" opacity="0.85">
                <ArcPath from={cities[1]} to={cities[2]} delay={0} />
                <ArcPath from={cities[0]} to={cities[5]} delay={0.6} />
                <ArcPath from={cities[6]} to={cities[1]} delay={1.2} />
                <ArcPath from={cities[2]} to={cities[4]} delay={1.8} />
                <ArcPath from={cities[9]} to={cities[2]} delay={2.4} />
              </g>

              {/* cities */}
              {cities.map((c, i) => (
                <g key={c.code} transform={`translate(${c.x},${c.y})`}>
                  {c.pulse && (
                    <motion.circle
                      r="6"
                      fill="var(--color-signal)"
                      initial={{ opacity: 0.6, scale: 1 }}
                      animate={{ opacity: 0, scale: 4 }}
                      transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.25, ease: "easeOut" }}
                    />
                  )}
                  <circle r="3" fill={c.pulse ? "var(--color-signal)" : "var(--color-bone)"} />
                  <circle r="3" fill="none" stroke="var(--color-bone)" strokeOpacity="0.5" strokeWidth="0.6" />
                  <text
                    x="9" y="3"
                    fill="var(--color-bone)" fillOpacity="0.85"
                    fontFamily="JetBrains Mono, monospace" fontSize="9" letterSpacing="1.5"
                  >
                    {c.code}
                  </text>
                  <text
                    x="9" y="14"
                    fill="var(--color-bone)" fillOpacity="0.4"
                    fontFamily="JetBrains Mono, monospace" fontSize="7" letterSpacing="1"
                  >
                    {c.name.toUpperCase()}
                  </text>
                </g>
              ))}
            </svg>

            {/* readout */}
            <div className="absolute left-6 bottom-12 border border-bone/30 bg-ink px-3 py-2 font-mono text-[10px] tracking-[0.18em] uppercase text-bone/80">
              <span className="text-signal">●</span> 14,302 wheels turning · now
            </div>
          </div>

          {/* FEED */}
          <div className="lg:col-span-4 bg-ink p-6 flex flex-col min-h-[400px]">
            <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.25em] uppercase text-bone/60 border-b border-bone/15 pb-3">
              <span>Dispatch Feed</span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 bg-signal rounded-full animate-blink" />
                live
              </span>
            </div>

            <div className="mt-4 grid grid-cols-[auto_1fr_auto] gap-x-3 gap-y-3 font-mono text-[11px]">
              {feed.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                  className="contents"
                >
                  <span className="text-bone/40 tracking-widest">{f.t}</span>
                  <span className="text-bone">
                    <span className="text-signal">{f.c}</span>
                    <span className="block text-bone/50 text-[10px] mt-0.5 tracking-[0.12em] uppercase">
                      {f.v} · {f.who}
                    </span>
                  </span>
                  <span className="text-bone font-serif italic text-base leading-none">{f.f}</span>
                </motion.div>
              ))}
            </div>

            <div className="mt-auto pt-6">
              <div className="font-mono text-[9px] tracking-[0.25em] uppercase text-bone/40 mb-3">
                ↳ printed continuously
              </div>
              <a
                href="#"
                className="group flex items-center justify-between border border-bone/30 px-4 py-3 hover:bg-signal hover:border-signal transition-colors"
              >
                <span className="font-mono text-[11px] tracking-[0.2em] uppercase">Open Live Console</span>
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ArcPath({ from, to, delay = 0 }: { from: City; to: City; delay?: number }) {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2 - 60;
  const d = `M${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`;
  return (
    <motion.path
      d={d}
      strokeDasharray="4 6"
      initial={{ pathLength: 0, opacity: 0 }}
      whileInView={{ pathLength: 1, opacity: 0.9 }}
      viewport={{ once: true }}
      transition={{ duration: 1.6, delay, ease: "easeInOut" }}
    />
  );
}

export default LiveDispatch;
