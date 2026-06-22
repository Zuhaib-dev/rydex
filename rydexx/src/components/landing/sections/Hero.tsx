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
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

/* ───────────────────────── HERO ───────────────────────── */
function Hero({ onAuthRequired }: { onAuthRequired: (redirectUrl?: string) => void }) {
  const { data: session } = useSession();
  const router = useRouter();

  const handleAction = (path: string) => {
    if (session) {
      router.push(path);
    } else {
      onAuthRequired(path);
    }
  };
  return (
    <section className="relative">
      <Crosshair className="top-6 left-6" />
      <Crosshair className="top-6 right-6" />

      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 pt-10 sm:pt-16 pb-10">
        {/* metadata strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-3 gap-x-6 mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground hairline-b pb-4 mb-10">
          <Meta k="Filed" v="22.06.26" />
          <Meta k="Field" v="Mobility / Logistics" />
          <Meta k="Coverage" v="40 cities" />
          <Meta k="Index" v="N° 001" />
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Headline */}
          <div className="lg:col-span-8 relative">
            <div className="mono text-[11px] tracking-[0.25em] uppercase text-signal mb-5 flex items-center gap-2">
              <Asterisk className="h-3 w-3" /> Chapter One — The Vehicle Question
            </div>

            <h1 className="serif font-black leading-[0.86] tracking-[-0.045em] text-[58px] sm:text-[88px] lg:text-[132px]">
              Book{" "}
              <span className="italic font-bold text-signal">any</span>
              <br />
              vehicle.<br />
              <span className="inline-flex items-baseline gap-3">
                Track
                <ArrowRight className="inline-block h-[0.7em] w-[0.7em] -mb-2 stroke-[1.5]" />
                <span className="italic font-bold">every</span>
              </span>
              <br />
              move<span className="text-signal">.</span>
            </h1>

            <div className="mt-8 grid sm:grid-cols-[1fr_auto] gap-6 items-end">
              <p className="serif text-xl sm:text-2xl leading-snug max-w-xl">
                From a <u className="decoration-signal decoration-2 underline-offset-4">₹30 bike run</u> at dawn to a <u className="decoration-signal decoration-2 underline-offset-4">10-tonne freight haul</u> at midnight — one terminal, every wheel on the road.
              </p>

              <div className="flex flex-col gap-2 mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
                <span>↑ Read aloud</span>
                <span>↑ See dispatch log</span>
                <span>↑ Source: live network</span>
              </div>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <button
                onClick={() => handleAction("/user/book")}
                className="group inline-flex items-center gap-3 brick pl-5 pr-2 py-2 hover:bg-signal transition-colors cursor-pointer"
              >
                <span className="mono text-[12px] tracking-[0.18em] uppercase">Book a Ride</span>
                <span className="grid h-9 w-9 place-items-center bg-bone text-ink">
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </button>
              <button
                onClick={() => handleAction("/partner/onboarding/vehicle")}
                className="group inline-flex items-center gap-2 hairline px-5 py-2.5 mono text-[12px] tracking-[0.18em] uppercase hover:brick transition-colors cursor-pointer"
              >
                Become a Partner
                <Plus className="h-3.5 w-3.5" />
              </button>
              <div className="ml-auto mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground hidden sm:flex items-center gap-2">
                <span className="h-1.5 w-1.5 bg-signal rounded-full animate-blink" /> 12,402 drivers online · now
              </div>
            </div>
          </div>

          {/* Specimen card */}
          <div className="lg:col-span-4 relative">
            <SpecimenCard />
          </div>
        </div>

        {/* stat row */}
        <div className="mt-16 grid grid-cols-3 hairline-t hairline-b divide-x divide-border">
          <Stat n="2.4M" l="rides / day" />
          <Stat n="150K" l="partner drivers" />
          <Stat n="4.9★" l="rated network" />
        </div>
      </div>
    </section>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-foreground/40">{k}</span>
      <span>—</span>
      <span className="text-foreground">{v}</span>
    </div>
  );
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div className="px-2 sm:px-6 py-6">
      <div className="serif text-4xl sm:text-6xl font-black leading-none">{n}</div>
      <div className="mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground mt-2">{l}</div>
    </div>
  );
}

export function Crosshair({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute pointer-events-none ${className}`}>
      <div className="relative h-3 w-3">
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-foreground/30" />
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-foreground/30" />
      </div>
    </div>
  );
}

/* Specimen — printed transit card mockup */
function SpecimenCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="relative"
    >
      <div className="relative hairline bg-card p-5 shadow-[8px_8px_0_0_var(--color-ink)]">
        <div className="flex items-center justify-between mono text-[10px] tracking-[0.18em] uppercase mb-4">
          <span>Specimen №01</span>
          <span className="text-signal">● live</span>
        </div>

        {/* Map */}
        <div className="relative aspect-4/5 hairline overflow-hidden bg-secondary">
          {/* grid */}
          <div
            className="absolute inset-0 opacity-50"
            style={{
              backgroundImage:
                "linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)",
              backgroundSize: "22px 22px",
            }}
          />
          {/* route */}
          <svg viewBox="0 0 300 360" className="absolute inset-0 h-full w-full">
            <path
              d="M40 320 C 100 280 80 200 160 180 S 260 80 260 40"
              fill="none"
              stroke="var(--color-ink)"
              strokeWidth="2"
              strokeDasharray="4 6"
            />
            <circle cx="40" cy="320" r="6" fill="var(--color-ink)" />
            <circle cx="260" cy="40" r="8" fill="var(--color-signal)" />
            <circle cx="260" cy="40" r="14" fill="none" stroke="var(--color-signal)" strokeWidth="1" />
          </svg>

          <div className="absolute top-3 left-3 mono text-[9px] tracking-[0.18em] uppercase bg-bone hairline px-2 py-1">
            Lal Chowk → Dal Lake
          </div>
          <div className="absolute bottom-3 right-3 mono text-[9px] tracking-[0.18em] uppercase signal-chip px-2 py-1">
            ETA 11 MIN
          </div>
        </div>

        {/* readout */}
        <div className="mt-5 grid grid-cols-3 gap-3 mono text-[10px] tracking-[0.14em] uppercase">
          <Readout k="Vehicle" v="SUV — XL6" />
          <Readout k="Plate" v="DL·5C·1234" />
          <Readout k="Fare" v="₹ 412" />
        </div>

        <div className="mt-4 hairline-t pt-3 flex items-center justify-between">
          <div>
            <div className="serif text-lg font-bold leading-tight">Rohan K.</div>
            <div className="mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
              4.96 ★ · 8,412 trips
            </div>
          </div>
          <div className="grid h-10 w-10 place-items-center brick">
            <ArrowUpRight className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* corner stamps */}
      <div className="absolute -top-3 -left-3 hairline bg-bone px-2 py-1 mono text-[9px] tracking-[0.2em] uppercase rotate-[-4deg]">
        ✶ Field Sample
      </div>
      <div className="absolute -bottom-3 -right-3 signal-chip px-2 py-1 mono text-[9px] tracking-[0.2em] uppercase rotate-3">
        Issue 22 · 2026
      </div>
    </motion.div>
  );
}

function Readout({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-foreground/40">{k}</div>
      <div className="mt-0.5">{v}</div>
    </div>
  );
}

export default Hero;
