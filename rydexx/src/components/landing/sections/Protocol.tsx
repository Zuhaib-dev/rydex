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

/* ───────────────────────── PROTOCOL ───────────────────────── */
const protocol = [
  {
    n: "I.",
    title: "Mark the route.",
    body:
      "Drop a pin, speak the address, or paste a link. Smart suggestions resolve the where in under a second — fare estimated before you tap go.",
  },
  {
    n: "II.",
    title: "Match the vehicle.",
    body:
      "A routing brain pairs your trip to the closest, highest-rated wheel for the job — bike to truck, picked in milliseconds across the live grid.",
  },
  {
    n: "III.",
    title: "Move under watch.",
    body:
      "Live GPS, shareable trip link, in-app SOS, one-time OTP at handover. Every ride logged, every haul receipted. No mystery.",
  },
];

function Protocol() {
  return (
    <section id="ride" className="relative">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 py-24">
        <div className="flex items-end justify-between mb-12 border-b border-border pb-4">
          <div>
            <div className="font-mono text-[11px] tracking-[0.25em] uppercase text-signal mb-3">§04 — Field Protocol</div>
            <h2 className="font-serif text-5xl sm:text-7xl font-black leading-[0.9] tracking-tighter">
              Three moves<span className="text-signal">.</span> Always.
            </h2>
          </div>
          <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground hidden md:block">
            Plate 03 of 04 →
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-px bg-border border border-border">
          {protocol.map((p, i) => (
            <motion.div
              key={p.n}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.55, delay: i * 0.12 }}
              className="bg-background p-8 min-h-[280px] flex flex-col"
            >
              <div className="flex items-center justify-between">
                <span className="font-serif text-5xl font-black italic">{p.n}</span>
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">step / {i + 1}.0</span>
              </div>
              <div className="mt-8 font-serif text-2xl font-bold tracking-tight">{p.title}</div>
              <p className="mt-3 text-sm leading-relaxed text-foreground/75 max-w-sm">{p.body}</p>
              <div className="mt-auto pt-6 border-t border-border h-px w-full" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Protocol;
