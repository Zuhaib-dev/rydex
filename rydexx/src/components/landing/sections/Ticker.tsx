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

/* ───────────────────────── TICKER ───────────────────────── */
function Ticker() {
  const items = [
    "VOL 04 / ISSUE 22",
    "★ LIVE DISPATCH",
    "2,481,309 RIDES TODAY",
    "↳ BLR → 14 MIN ETA AVG",
    "FLEET STATUS: NOMINAL",
    "BIKE · AUTO · SEDAN · SUV · VAN · TRUCK",
    "FILED FROM MUMBAI · 28.06°N",
  ];
  const loop = [...items, ...items, ...items];
  return (
    <div className="brick mono text-[10px] tracking-[0.2em] py-2 overflow-hidden hairline-b">
      <div className="flex gap-10 whitespace-nowrap animate-marquee w-max">
        {loop.map((t, i) => (
          <span key={i} className="flex items-center gap-3">
            <span className="text-signal">●</span>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

export default Ticker;
