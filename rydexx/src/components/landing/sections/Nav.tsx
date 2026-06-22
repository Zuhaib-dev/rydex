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

import AuthModel from "../../AuthModel";

/* ───────────────────────── NAV ───────────────────────── */
function Nav({ onAuthRequired }: { onAuthRequired: () => void }) {
  return (
    <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-md hairline-b">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 grid grid-cols-[auto_1fr_auto] items-center gap-6 py-3">
        <a href="#" className="flex items-baseline gap-1.5">
          <span className="serif text-[28px] font-black leading-none tracking-tighter">Rydex</span>
          <span className="mono text-[10px] text-muted-foreground">™</span>
        </a>

        <nav className="hidden md:flex items-center justify-center gap-8 mono text-[11px] tracking-[0.18em] uppercase">
          {["Ride / 01", "Drive / 02", "Enterprise / 03", "Fleet / 04"].map((l) => (
            <a key={l} href="#" className="relative group">
              {l}
              <span className="absolute -bottom-1 left-0 right-0 h-px bg-foreground scale-x-0 group-hover:scale-x-100 origin-left transition-transform" />
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button onClick={onAuthRequired} className="hidden sm:inline mono text-[11px] tracking-[0.18em] uppercase">
            Log in →
          </button>
          <button
            onClick={onAuthRequired}
            className="group inline-flex items-center gap-2 brick px-4 py-2 mono text-[11px] tracking-[0.18em] uppercase hover:bg-signal transition-colors"
          >
            Get the App
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
        </div>
      </div>
    </header>
  );
}

export default Nav;
