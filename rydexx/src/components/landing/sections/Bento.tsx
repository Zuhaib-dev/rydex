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

/* ───────────────────────── BENTO TESTIMONIALS ───────────────────────── */
function Bento() {
  return (
    <section className="relative">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 py-24">
        <div className="flex items-end justify-between mb-12 border-b border-border pb-4 gap-6 flex-wrap">
          <div>
            <div className="font-mono text-[11px] tracking-[0.25em] uppercase text-signal mb-3">§05 — Field Reports</div>
            <h2 className="font-serif text-5xl sm:text-7xl font-black leading-[0.9] tracking-tighter max-w-3xl">
              What the <span className="italic font-bold">drivers</span>, riders & shippers say<span className="text-signal">.</span>
            </h2>
          </div>
          <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground hidden md:block">
            collected Q2 · 2026 · n = 4,108
          </div>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 sm:grid-cols-6 lg:grid-cols-12 auto-rows-[minmax(180px,auto)] sm:auto-rows-[180px] gap-3">
          {/* Big quote */}
          <BentoTile className="sm:col-span-6 lg:col-span-7 row-span-2 brick text-bone p-8 flex flex-col">
            <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-bone/50">Quote / 01 — verified rider</div>
            <p className="font-serif text-2xl sm:text-3xl lg:text-4xl leading-[1.15] font-medium mt-6">
              <span className="text-signal">“</span>I booked a bike to the metro, a sedan to the airport, and a 5-tonne truck to move my studio — <em className="not-italic font-bold text-signal">all in the same week, same app</em>. Rydex is the only thing on my home screen now.<span className="text-signal">”</span>
            </p>
            <div className="mt-auto pt-8 flex items-end justify-between">
              <div>
                <div className="font-serif text-xl font-bold">Ananya R.</div>
                <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-bone/60">Designer · Bengaluru</div>
              </div>
              <Avatar initials="AR" />
            </div>
          </BentoTile>

          {/* Stat tile */}
          <BentoTile className="sm:col-span-3 lg:col-span-5 lg:row-span-1 signal-chip p-6 flex flex-col justify-between">
            <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-bone/80">satisfaction · ytd</div>
            <div className="flex items-baseline gap-3">
              <span className="font-serif text-7xl sm:text-8xl font-black leading-none">98.4</span>
              <span className="font-serif italic text-4xl sm:text-5xl font-bold text-bone/90 leading-none">%</span>
            </div>
            <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-bone/80">
              ↳ trips rated 5★ across the network
            </div>
          </BentoTile>

          {/* Small quote */}
          <BentoTile className="sm:col-span-3 lg:col-span-5 lg:row-span-1 bg-card p-6 flex flex-col">
            <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-muted-foreground">Quote / 02</div>
            <p className="font-serif text-lg leading-snug mt-3 flex-1">
              <span className="text-signal">“</span>Switched our entire last-mile fleet over. Dispatch is 3× faster. <em className="not-italic font-bold">Period.</em><span className="text-signal">”</span>
            </p>
            <div className="flex items-end justify-between mt-4">
              <div>
                <div className="font-serif font-bold">Vikram S.</div>
                <div className="font-mono text-[9px] tracking-[0.2em] uppercase text-muted-foreground">Ops · BlueCart Logistics</div>
              </div>
              <Avatar initials="VS" />
            </div>
          </BentoTile>

          {/* Illustration: bike */}
          <BentoTile className="sm:col-span-3 lg:col-span-4 lg:row-span-1 bg-secondary p-6 relative overflow-hidden">
            <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-muted-foreground">Plate · The Darter</div>
            <BikeIllustration />
            <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between">
              <div className="font-serif text-2xl font-bold leading-none">8 min<br/><span className="text-signal italic text-lg">avg ETA</span></div>
              <div className="font-mono text-[9px] tracking-[0.2em] uppercase text-muted-foreground text-right">
                ↳ darter<br/>class
              </div>
            </div>
          </BentoTile>

          {/* Quote */}
          <BentoTile className="sm:col-span-3 lg:col-span-4 lg:row-span-1 bg-card p-6 flex flex-col">
            <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-muted-foreground">Quote / 03 — driver</div>
            <p className="font-serif text-lg leading-snug mt-3 flex-1">
              <span className="text-signal">“</span>Earnings dashboard is honest. Daily settlements. I drive happy.<span className="text-signal">”</span>
            </p>
            <div className="flex items-end justify-between mt-4">
              <div>
                <div className="font-serif font-bold">Imran K.</div>
                <div className="font-mono text-[9px] tracking-[0.2em] uppercase text-muted-foreground">Partner · 3 yr</div>
              </div>
              <Avatar initials="IK" />
            </div>
          </BentoTile>

          {/* Award / press */}
          <BentoTile className="sm:col-span-6 lg:col-span-4 lg:row-span-1 border border-border bg-background p-6 flex flex-col justify-between">
            <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-muted-foreground">Press</div>
            <div>
              <div className="font-serif italic text-xl leading-tight">"Built like a Swiss railway, priced like a kirana store."</div>
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mt-3">— The Mobility Quarterly</div>
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] uppercase">
              <span className="signal-chip px-1.5 py-0.5">★ 2026</span>
              <span>Editor's pick</span>
            </div>
          </BentoTile>

          {/* Stat tile 2 */}
          <BentoTile className="sm:col-span-3 lg:col-span-4 lg:row-span-1 brick text-bone p-6 flex flex-col justify-between">
            <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-bone/50">cities live</div>
            <div className="font-serif text-7xl font-black leading-none">40<span className="text-signal">+</span></div>
            <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-bone/60">↳ new every month</div>
          </BentoTile>

          {/* Long horizontal quote */}
          <BentoTile className="sm:col-span-3 lg:col-span-8 row-span-2 sm:row-span-1 bg-card p-6 flex flex-col sm:flex-row sm:items-center gap-6">
            <Avatar initials="PM" large />
            <div className="flex-1">
              <p className="font-serif text-xl sm:text-2xl leading-snug">
                <span className="text-signal">“</span>For our wedding week we ran <em className="not-italic font-bold">23 vehicles</em> across 4 cities through Rydex — zero spreadsheets, one invoice.<span className="text-signal">”</span>
              </p>
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mt-3">
                Tariq A. · Tour guide · Srinagar
              </div>
            </div>
          </BentoTile>
        </div>
      </div>
    </section>
  );
}

function BentoTile({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
      className={`relative overflow-hidden ${className}`}
    >
      {children}
    </motion.div>
  );
}

function Avatar({ initials, large = false }: { initials: string; large?: boolean }) {
  const size = large ? "h-16 w-16 text-xl" : "h-10 w-10 text-xs";
  return (
    <div className={`shrink-0 grid place-items-center rounded-full border border-border bg-bone text-ink font-serif font-bold ${size}`}>
      {initials}
    </div>
  );
}

function BikeIllustration() {
  return (
    <motion.svg
      viewBox="0 0 240 120"
      className="absolute right-2 top-8 w-[170px] sm:w-[200px]"
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* wheels */}
      <circle cx="60"  cy="85" r="22" fill="none" stroke="var(--color-ink)" strokeWidth="2" />
      <circle cx="60"  cy="85" r="3"  fill="var(--color-ink)" />
      <circle cx="180" cy="85" r="22" fill="none" stroke="var(--color-ink)" strokeWidth="2" />
      <circle cx="180" cy="85" r="3"  fill="var(--color-ink)" />
      {/* frame */}
      <path d="M60 85 L110 85 L140 45 L180 85 M110 85 L130 45 L140 45 M180 85 L155 45 L140 45"
        fill="none" stroke="var(--color-ink)" strokeWidth="2" strokeLinejoin="round" />
      {/* seat & handle */}
      <path d="M120 42 L138 42" stroke="var(--color-ink)" strokeWidth="3" strokeLinecap="round" />
      <path d="M152 42 L165 35" stroke="var(--color-ink)" strokeWidth="3" strokeLinecap="round" />
      {/* signal flag */}
      <rect x="155" y="20" width="22" height="14" fill="var(--color-signal)" />
      <line x1="155" y1="20" x2="155" y2="48" stroke="var(--color-ink)" strokeWidth="1.5" />
      {/* motion lines */}
      <g stroke="var(--color-signal)" strokeWidth="1.5" strokeLinecap="round">
        <line x1="8"  y1="60" x2="34" y2="60" />
        <line x1="14" y1="78" x2="38" y2="78" />
        <line x1="6"  y1="96" x2="30" y2="96" />
      </g>
    </motion.svg>
  );
}

export default Bento;
