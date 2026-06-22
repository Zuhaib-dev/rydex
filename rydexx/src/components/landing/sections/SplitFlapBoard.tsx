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

/* ───────────────────────── SPLIT-FLAP DEPARTURE BOARD ───────────────────────── */
const boardRows: { route: string; vehicle: string; gate: string; eta: string; status: "BOARDING" | "ENROUTE" | "ARRIVED" | "DELAYED" }[] = [
  { route: "SXR → GLM", vehicle: "SEDAN  XL6", gate: "G-04", eta: "00:11", status: "BOARDING" },
  { route: "JMU → SXR", vehicle: "BIKE   125",  gate: "G-12", eta: "00:04", status: "ENROUTE"  },
  { route: "SXR → PAH", vehicle: "TRUCK  10T",  gate: "F-22", eta: "04:18", status: "ENROUTE"  },
  { route: "LAD → SXR", vehicle: "AUTO   3W",   gate: "G-07", eta: "00:09", status: "BOARDING" },
  { route: "SXR → ANP", vehicle: "SUV    XL7",  gate: "G-02", eta: "00:21", status: "DELAYED"  },
  { route: "SXR → SNG", vehicle: "VAN    9PX",  gate: "F-15", eta: "06:40", status: "ENROUTE"  },
  { route: "JAI → DEL", vehicle: "SEDAN  C5",   gate: "G-09", eta: "03:55", status: "ARRIVED"  },
];

const statusTint: Record<string, string> = {
  BOARDING: "text-signal",
  ENROUTE: "text-bone",
  ARRIVED: "text-acid",
  DELAYED: "text-signal",
};

function SplitFlap({ value }: { value: string }) {
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    if (display === value) return;
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let i = 0;
    const id = setInterval(() => {
      i++;
      const next = value
        .split("")
        .map((c, idx) => {
          if (idx < i) return c;
          if (!/[A-Z0-9]/i.test(c)) return c; // keep →, :, ·, space stable
          return chars[Math.floor(Math.random() * chars.length)];
        })
        .join("");
      setDisplay(next);
      if (i >= value.length) clearInterval(id);
    }, 55);
    return () => clearInterval(id);
  }, [value, display]);

  return (
    <span className="tabular-nums inline-flex">
      {display.split("").map((c, idx) => (
        <span key={idx} className="inline-block text-center" style={{ width: "0.62em" }}>
          {c === " " ? "\u00A0" : c}
        </span>
      ))}
    </span>
  );
}

function SplitFlapBoard() {
  const [rows, setRows] = useState(boardRows);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setRows((prev) => {
        const next = [...prev];
        const i = Math.floor(Math.random() * next.length);
        const cur = next[i];
        const mins = Math.max(0, parseInt(cur.eta.split(":")[1]) - 1 + (Math.random() > 0.7 ? 3 : 0));
        const hrs = parseInt(cur.eta.split(":")[0]);
        const newEta = `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
        const statuses: typeof cur.status[] = ["BOARDING", "ENROUTE", "ARRIVED", "DELAYED"];
        next[i] = { ...cur, eta: newEta, status: statuses[Math.floor(Math.random() * statuses.length)] };
        return next;
      });
      setTick((t) => t + 1);
    }, 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative brick text-bone overflow-hidden">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 py-24">
        <div className="grid lg:grid-cols-12 gap-6 mb-10 items-end">
          <div className="lg:col-span-3 font-mono text-[11px] tracking-[0.25em] uppercase text-bone/60">§05 — Departures</div>
          <h2 className="lg:col-span-6 font-serif font-black leading-[0.88] tracking-tighter text-5xl sm:text-7xl">
            The board <span className="italic font-bold text-signal">never stops</span> flipping.
          </h2>
          <div className="lg:col-span-3 font-mono text-[10px] tracking-[0.2em] uppercase text-bone/60 flex flex-col gap-1">
            <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 bg-signal rounded-full animate-blink" /> mechanical · live</span>
            <span>tick {String(tick).padStart(4, "0")}</span>
          </div>
        </div>

        <div className="relative border border-bone/20 bg-ink p-2 sm:p-3 shadow-[10px_10px_0_0_var(--color-signal)]">
          <div className="grid grid-cols-[1.5fr_1.4fr_0.7fr_0.8fr_1fr] gap-2 sm:gap-4 px-3 sm:px-5 py-3 border-b border-bone/15 font-mono text-[9px] sm:text-[10px] tracking-[0.25em] uppercase text-bone/45">
            <span>Route</span>
            <span className="hidden sm:block">Vehicle</span>
            <span>Gate</span>
            <span>ETA</span>
            <span className="text-right">Status</span>
          </div>

          <div className="divide-y divide-bone/10">
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-[1.5fr_1.4fr_0.7fr_0.8fr_1fr] gap-2 sm:gap-4 px-3 sm:px-5 py-3 sm:py-4 font-mono text-[12px] sm:text-[15px] items-center">
                <span className="text-bone font-bold tracking-widest"><SplitFlap value={r.route} /></span>
                <span className="hidden sm:block text-bone/70 tracking-[0.15em]"><SplitFlap value={r.vehicle} /></span>
                <span className="text-bone/80 tracking-widest"><SplitFlap value={r.gate} /></span>
                <span className="text-bone tracking-widest tabular-nums"><SplitFlap value={r.eta} /></span>
                <span className={`text-right tracking-[0.18em] text-[10px] sm:text-[11px] ${statusTint[r.status]}`}>
                  ● <SplitFlap value={r.status} />
                </span>
              </div>
            ))}
          </div>

          <div className="mt-1 flex items-center justify-between px-5 py-2 border-t border-bone/15 font-mono text-[9px] sm:text-[10px] tracking-[0.25em] uppercase text-bone/45">
            <span>RYDEX · DEPARTURE TERMINAL</span>
            <span className="hidden sm:block">↳ refreshing every 2.2s</span>
            <span>v 04.22</span>
          </div>
        </div>

        <div className="mt-6 grid sm:grid-cols-3 gap-4 font-mono text-[10px] tracking-[0.2em] uppercase text-bone/55">
          <span>↳ flap letters are real — watch the row redraw</span>
          <span className="hidden sm:block text-center">★ inspired by Solari di Udine boards</span>
          <span className="sm:text-right">filed Srinagar · 06:14 IST</span>
        </div>
      </div>
    </section>
  );
}

export default SplitFlapBoard;
