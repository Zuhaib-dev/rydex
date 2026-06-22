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

/* ───────────────────────── PRICING LEDGER (invoice-style) ───────────────────────── */
const ledger = [
  { plan: "Rider", sub: "Pay-as-you-roll", price: "₹ 0", suffix: "/ month",
    note: "you only pay the fare.",
    rows: ["Unlimited bookings · bike → SUV", "Live trip share + SOS", "Loyalty: 1★ per ₹50 spent", "Splitwise-style fare splits"],
    cta: "Book a Ride", href: "/user/book", stamp: null, invert: false },
  { plan: "Driver", sub: "Partner program", price: "0 %", suffix: "commission · week 1",
    note: "daily settlements, honest math.",
    rows: ["Earnings dashboard + tax exports", "Free fuel insurance month 1", "Boost zones · surge transparency", "24×7 partner desk · 6 languages"],
    cta: "Drive with Rydex", href: "/partner/onboarding/vehicle", stamp: "MOST DRIVEN", invert: true },
  { plan: "Enterprise", sub: "Fleet API", price: "₹ talk", suffix: "to ops",
    note: "your wheels. our terminal.",
    rows: ["Single invoice across 40 cities", "Webhook + REST fleet API", "SLA-backed dispatch · 99.97 %", "Custom branding · white-label app"],
    cta: "Book a Demo", href: "/contact", stamp: null, invert: false },
];

function Ledger() {
  return (
    <section id="pricing" className="relative">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 py-24">
        <div className="grid lg:grid-cols-12 gap-6 mb-12 border-b border-border pb-6 items-end">
          <div className="lg:col-span-3 font-mono text-[11px] tracking-[0.25em] uppercase text-signal">§07 — The Ledger</div>
          <h2 className="lg:col-span-6 font-serif font-black leading-[0.9] tracking-tighter text-5xl sm:text-7xl">
            Pricing, <span className="italic font-bold">itemised</span>.
          </h2>
          <div className="lg:col-span-3 font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
            Receipt N° 22 · GST incl. · zero surprises
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {ledger.map((l, i) => (
            <motion.div
              key={l.plan}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.55, delay: i * 0.08 }}
              className={`relative ${l.invert ? "brick text-bone" : "bg-card text-foreground"} border ${l.invert ? "border-border" : "border-border"} shadow-[6px_6px_0_0_var(--color-ink)]`}
            >
              {/* perforated top */}
              <div className="absolute top-0 inset-x-0 h-2 flex">
                {Array.from({ length: 40 }).map((_, k) => (
                  <span key={k} className={`flex-1 ${k % 2 === 0 ? (l.invert ? "bg-bone/15" : "bg-ink/15") : ""}`} />
                ))}
              </div>

              {l.stamp && (
                <div className="absolute -top-4 right-6 signal-chip px-3 py-1 font-mono text-[10px] tracking-[0.25em] uppercase -rotate-3 shadow-[3px_3px_0_0_var(--color-ink)]">
                  ★ {l.stamp}
                </div>
              )}

              <div className="p-7 pt-9">
                <div className={`flex items-center justify-between font-mono text-[10px] tracking-[0.25em] uppercase ${l.invert ? "text-bone/55" : "text-muted-foreground"}`}>
                  <span>Plan · 0{i + 1}</span>
                  <span>{l.sub}</span>
                </div>

                <div className="mt-5 font-serif text-5xl font-black tracking-tighter">{l.plan}</div>

                <div className="mt-6 flex items-baseline gap-2">
                  <span className="serif text-6xl font-black leading-none">{l.price}</span>
                  <span className={`mono text-[11px] tracking-[0.18em] uppercase ${l.invert ? "text-bone/60" : "text-muted-foreground"}`}>{l.suffix}</span>
                </div>
                <div className={`mt-2 serif italic text-base ${l.invert ? "text-bone/70" : "text-foreground/70"}`}>{l.note}</div>

                <div className="my-6 h-px w-full" style={{
                  backgroundImage: `repeating-linear-gradient(90deg, ${l.invert ? "rgba(245,240,232,0.35)" : "rgba(20,18,15,0.35)"} 0 6px, transparent 6px 12px)`
                }} />

                <ul className="space-y-3">
                  {l.rows.map((r) => (
                    <li key={r} className="flex items-start gap-3 mono text-[12px] tracking-[0.05em]">
                      <Check className="h-4 w-4 mt-0.5 shrink-0 text-signal" />
                      <span className={l.invert ? "text-bone/85" : "text-foreground/85"}>{r}</span>
                    </li>
                  ))}
                </ul>

                <div className="my-6 h-px w-full" style={{
                  backgroundImage: `repeating-linear-gradient(90deg, ${l.invert ? "rgba(245,240,232,0.35)" : "rgba(20,18,15,0.35)"} 0 6px, transparent 6px 12px)`
                }} />

                <a href={l.href} className={`group flex items-center justify-between mt-2 px-4 py-3 border ${l.invert ? "border-bone bg-bone text-ink hover:bg-signal hover:text-bone hover:border-signal" : "border-ink bg-ink text-bone hover:bg-signal hover:border-signal"} transition-colors`}>
                  <span className="mono text-[11px] tracking-[0.2em] uppercase">{l.cta}</span>
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </a>

                <div className={`mt-6 flex items-center justify-between mono text-[9px] tracking-[0.25em] uppercase ${l.invert ? "text-bone/40" : "text-muted-foreground"}`}>
                  <span>line · 00{i + 1}</span>
                  <span className="flex items-center gap-1"><Stamp className="h-3 w-3" /> approved</span>
                </div>
              </div>

              {/* perforated bottom */}
              <div className="absolute bottom-0 inset-x-0 h-2 flex">
                {Array.from({ length: 40 }).map((_, k) => (
                  <span key={k} className={`flex-1 ${k % 2 === 0 ? (l.invert ? "bg-bone/15" : "bg-ink/15") : ""}`} />
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-x-8 gap-y-2 mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground hairline-t pt-5">
          <span>* fares vary by city · time · vehicle class</span>
          <span>* no peak-hour gouging — capped at +18 %</span>
          <span>* cancellations free under 90 sec</span>
          <span className="ml-auto">↳ full tariff sheet</span>
        </div>
      </div>
    </section>
  );
}

export default Ledger;
