"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import AuthModel from "../AuthModel";
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
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export default function FaceLiftLanding() {
  const [authOpen, setAuthOpen] = useState(false);
  const openAuth = () => setAuthOpen(true);

  return (
    <div className="facelift-landing min-h-screen overflow-x-hidden">
      <Ticker />
      <Nav onAuthRequired={openAuth} />
      <Hero onAuthRequired={openAuth} />
      <Specimens />
      <LiveDispatch />
      <Protocol />
      <Bento />
      <Manifesto />
      <Foot />
      <AuthModel
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        redirectTo="/user/book"
      />
    </div>
  );
}

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

/* ───────────────────────── HERO ───────────────────────── */
function Hero({ onAuthRequired }: { onAuthRequired: () => void }) {
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
                onClick={onAuthRequired}
                className="group inline-flex items-center gap-3 brick pl-5 pr-2 py-2 hover:bg-signal transition-colors cursor-pointer"
              >
                <span className="mono text-[12px] tracking-[0.18em] uppercase">Book a Ride</span>
                <span className="grid h-9 w-9 place-items-center bg-bone text-ink">
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </button>
              <button
                onClick={onAuthRequired}
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

function Crosshair({ className = "" }: { className?: string }) {
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
        <div className="relative aspect-[4/5] hairline overflow-hidden bg-secondary">
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
            Bandra → Andheri
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
      <div className="absolute -bottom-3 -right-3 signal-chip px-2 py-1 mono text-[9px] tracking-[0.2em] uppercase rotate-[3deg]">
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

/* ───────────────────────── FLEET / SPECIMENS ───────────────────────── */
type V = { n: string; name: string; tag: string; price: string; capacity: string; icon: LucideIcon; speed: string };

const fleet: V[] = [
  { n: "01", name: "Bike",        tag: "darter",     price: "₹ 30",    capacity: "1 pax · 5 kg",  speed: "60 km/h", icon: Bike },
  { n: "02", name: "Auto",        tag: "three-wheel",price: "₹ 50",    capacity: "3 pax",         speed: "55 km/h", icon: CarTaxiFront },
  { n: "03", name: "Sedan",       tag: "premium",    price: "₹ 180",   capacity: "4 pax · AC",    speed: "120 km/h", icon: Car },
  { n: "04", name: "SUV / Van",   tag: "crew",       price: "₹ 260",   capacity: "7 pax · gear",  speed: "140 km/h", icon: Package },
  { n: "05", name: "Truck",       tag: "freight",    price: "₹ 2,400", capacity: "10 tonnes",     speed: "90 km/h",  icon: Truck },
  { n: "06", name: "Custom",      tag: "enterprise", price: "on req.", capacity: "your fleet",    speed: "—",        icon: MapPin },
];

function Specimens() {
  return (
    <section id="fleet" className="relative brick text-bone">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 py-20">
        <div className="grid lg:grid-cols-12 gap-6 mb-12">
          <div className="lg:col-span-3 mono text-[11px] tracking-[0.25em] uppercase text-bone/60">
            §02 — The Catalogue
          </div>
          <h2 className="lg:col-span-9 serif font-black leading-[0.9] tracking-tighter text-5xl sm:text-7xl lg:text-8xl">
            Six wheels, <span className="italic font-bold text-signal">one</span> network.
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 border-l border-t border-bone/15">
          {fleet.map((v) => (
            <Specimen key={v.n} v={v} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Specimen({ v }: { v: V }) {
  const Icon = v.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5 }}
      className="group relative p-6 border-r border-b border-bone/15 min-h-[300px] flex flex-col hover:bg-signal transition-colors duration-300"
    >
      <div className="flex items-start justify-between mono text-[10px] tracking-[0.2em] uppercase text-bone/60 group-hover:text-bone/80">
        <span>spec / {v.n}</span>
        <span>{v.tag}</span>
      </div>

      <div className="my-6 flex items-end justify-between">
        <Icon className="h-16 w-16 stroke-[1.2]" />
        <span className="serif text-7xl font-black leading-none -mr-1">{v.n}</span>
      </div>

      <div className="mt-auto">
        <div className="serif text-3xl font-bold tracking-tight">{v.name}</div>
        <div className="mt-4 grid grid-cols-3 gap-2 mono text-[10px] tracking-[0.14em] uppercase">
          <div>
            <div className="text-bone/50">fare</div>
            <div>{v.price}</div>
          </div>
          <div>
            <div className="text-bone/50">cap</div>
            <div>{v.capacity}</div>
          </div>
          <div>
            <div className="text-bone/50">v-max</div>
            <div>{v.speed}</div>
          </div>
        </div>
      </div>

      <ArrowUpRight className="absolute top-6 right-6 h-4 w-4 opacity-0 group-hover:opacity-100 transition" />
    </motion.div>
  );
}

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
          <div className="lg:col-span-3 mono text-[11px] tracking-[0.25em] uppercase text-bone/60">
            §03 — Live Dispatch
          </div>
          <h2 className="lg:col-span-6 serif font-black leading-[0.88] tracking-tighter text-5xl sm:text-7xl">
            The country, <span className="italic font-bold text-signal">in motion</span>.
          </h2>
          <div className="lg:col-span-3 mono text-[10px] tracking-[0.2em] uppercase text-bone/60">
            <div className="flex items-center gap-2 mb-1">
              <span className="h-1.5 w-1.5 bg-signal rounded-full animate-blink" />
              streaming · realtime
            </div>
            <div>last refresh: 0.4s ago</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-px bg-bone/15 border border-bone/15">
          {/* MAP */}
          <div className="lg:col-span-8 bg-ink relative aspect-[5/6] sm:aspect-[7/6] lg:aspect-auto lg:min-h-[600px] p-6">
            <div className="absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage:
                  "linear-gradient(var(--color-bone) 1px, transparent 1px), linear-gradient(90deg, var(--color-bone) 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />

            {/* corner labels */}
            <div className="absolute top-4 left-4 mono text-[9px] tracking-[0.25em] uppercase text-bone/50">N 28.61° · INDIA</div>
            <div className="absolute top-4 right-4 mono text-[9px] tracking-[0.25em] uppercase text-bone/50">PLATE 03 / DISPATCH</div>
            <div className="absolute bottom-4 left-4 mono text-[9px] tracking-[0.25em] uppercase text-bone/50">SCALE — 1 PX / 6 KM</div>
            <div className="absolute bottom-4 right-4 mono text-[9px] tracking-[0.25em] uppercase text-bone/50">SRC: rydex.live</div>

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
            <div className="absolute left-6 bottom-12 hairline border-bone/30 bg-ink px-3 py-2 mono text-[10px] tracking-[0.18em] uppercase text-bone/80">
              <span className="text-signal">●</span> 14,302 wheels turning · now
            </div>
          </div>

          {/* FEED */}
          <div className="lg:col-span-4 bg-ink p-6 flex flex-col min-h-[400px]">
            <div className="flex items-center justify-between mono text-[10px] tracking-[0.25em] uppercase text-bone/60 hairline-b border-bone/15 pb-3">
              <span>Dispatch Feed</span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 bg-signal rounded-full animate-blink" />
                live
              </span>
            </div>

            <div className="mt-4 grid grid-cols-[auto_1fr_auto] gap-x-3 gap-y-3 mono text-[11px]">
              {feed.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                  className="contents"
                >
                  <span className="text-bone/40 tracking-[0.1em]">{f.t}</span>
                  <span className="text-bone">
                    <span className="text-signal">{f.c}</span>
                    <span className="block text-bone/50 text-[10px] mt-0.5 tracking-[0.12em] uppercase">
                      {f.v} · {f.who}
                    </span>
                  </span>
                  <span className="text-bone serif italic text-base leading-none">{f.f}</span>
                </motion.div>
              ))}
            </div>

            <div className="mt-auto pt-6">
              <div className="mono text-[9px] tracking-[0.25em] uppercase text-bone/40 mb-3">
                ↳ printed continuously
              </div>
              <a
                href="#"
                className="group flex items-center justify-between border border-bone/30 px-4 py-3 hover:bg-signal hover:border-signal transition-colors"
              >
                <span className="mono text-[11px] tracking-[0.2em] uppercase">Open Live Console</span>
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

/* ───────────────────────── BENTO TESTIMONIALS ───────────────────────── */
function Bento() {
  return (
    <section className="relative">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 py-24">
        <div className="flex items-end justify-between mb-12 hairline-b pb-4 gap-6 flex-wrap">
          <div>
            <div className="mono text-[11px] tracking-[0.25em] uppercase text-signal mb-3">§05 — Field Reports</div>
            <h2 className="serif text-5xl sm:text-7xl font-black leading-[0.9] tracking-tighter max-w-3xl">
              What the <span className="italic font-bold">drivers</span>, riders & shippers say<span className="text-signal">.</span>
            </h2>
          </div>
          <div className="mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground hidden md:block">
            collected Q2 · 2026 · n = 4,108
          </div>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 sm:grid-cols-6 lg:grid-cols-12 auto-rows-[180px] gap-3">
          {/* Big quote */}
          <BentoTile className="sm:col-span-6 lg:col-span-7 lg:row-span-2 brick text-bone p-8 flex flex-col">
            <div className="mono text-[10px] tracking-[0.25em] uppercase text-bone/50">Quote / 01 — verified rider</div>
            <p className="serif text-2xl sm:text-3xl lg:text-4xl leading-[1.15] font-medium mt-6">
              <span className="text-signal">“</span>I booked a bike to the metro, a sedan to the airport, and a 5-tonne truck to move my studio — <em className="not-italic font-bold text-signal">all in the same week, same app</em>. Rydex is the only thing on my home screen now.<span className="text-signal">”</span>
            </p>
            <div className="mt-auto pt-8 flex items-end justify-between">
              <div>
                <div className="serif text-xl font-bold">Ananya R.</div>
                <div className="mono text-[10px] tracking-[0.2em] uppercase text-bone/60">Designer · Bengaluru</div>
              </div>
              <Avatar initials="AR" />
            </div>
          </BentoTile>

          {/* Stat tile */}
          <BentoTile className="sm:col-span-3 lg:col-span-5 lg:row-span-1 signal-chip p-6 flex flex-col justify-between">
            <div className="mono text-[10px] tracking-[0.25em] uppercase text-bone/80">satisfaction · ytd</div>
            <div className="flex items-baseline gap-3">
              <span className="serif text-7xl sm:text-8xl font-black leading-none">98.4</span>
              <span className="serif italic text-4xl sm:text-5xl font-bold text-bone/90 leading-none">%</span>
            </div>
            <div className="mono text-[10px] tracking-[0.2em] uppercase text-bone/80">
              ↳ trips rated 5★ across the network
            </div>
          </BentoTile>

          {/* Small quote */}
          <BentoTile className="sm:col-span-3 lg:col-span-5 lg:row-span-1 bg-card p-6 flex flex-col">
            <div className="mono text-[10px] tracking-[0.25em] uppercase text-muted-foreground">Quote / 02</div>
            <p className="serif text-lg leading-snug mt-3 flex-1">
              <span className="text-signal">“</span>Switched our entire last-mile fleet over. Dispatch is 3× faster. <em className="not-italic font-bold">Period.</em><span className="text-signal">”</span>
            </p>
            <div className="flex items-end justify-between mt-4">
              <div>
                <div className="serif font-bold">Vikram S.</div>
                <div className="mono text-[9px] tracking-[0.2em] uppercase text-muted-foreground">Ops · BlueCart Logistics</div>
              </div>
              <Avatar initials="VS" />
            </div>
          </BentoTile>

          {/* Illustration: bike */}
          <BentoTile className="sm:col-span-3 lg:col-span-4 lg:row-span-1 bg-secondary p-6 relative overflow-hidden">
            <div className="mono text-[10px] tracking-[0.25em] uppercase text-muted-foreground">Plate · The Darter</div>
            <BikeIllustration />
            <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between">
              <div className="serif text-2xl font-bold leading-none">8 min<br/><span className="text-signal italic text-lg">avg ETA</span></div>
              <div className="mono text-[9px] tracking-[0.2em] uppercase text-muted-foreground text-right">
                ↳ darter<br/>class
              </div>
            </div>
          </BentoTile>

          {/* Quote */}
          <BentoTile className="sm:col-span-3 lg:col-span-4 lg:row-span-1 bg-card p-6 flex flex-col">
            <div className="mono text-[10px] tracking-[0.25em] uppercase text-muted-foreground">Quote / 03 — driver</div>
            <p className="serif text-lg leading-snug mt-3 flex-1">
              <span className="text-signal">“</span>Earnings dashboard is honest. Daily settlements. I drive happy.<span className="text-signal">”</span>
            </p>
            <div className="flex items-end justify-between mt-4">
              <div>
                <div className="serif font-bold">Imran K.</div>
                <div className="mono text-[9px] tracking-[0.2em] uppercase text-muted-foreground">Partner · 3 yr</div>
              </div>
              <Avatar initials="IK" />
            </div>
          </BentoTile>

          {/* Award / press */}
          <BentoTile className="sm:col-span-6 lg:col-span-4 lg:row-span-1 hairline bg-background p-6 flex flex-col justify-between">
            <div className="mono text-[10px] tracking-[0.25em] uppercase text-muted-foreground">Press</div>
            <div>
              <div className="serif italic text-xl leading-tight">"Built like a Swiss railway, priced like a kirana store."</div>
              <div className="mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mt-3">— The Mobility Quarterly</div>
            </div>
            <div className="flex items-center gap-2 mono text-[10px] tracking-[0.2em] uppercase">
              <span className="signal-chip px-1.5 py-0.5">★ 2026</span>
              <span>Editor's pick</span>
            </div>
          </BentoTile>

          {/* Stat tile 2 */}
          <BentoTile className="sm:col-span-3 lg:col-span-4 lg:row-span-1 brick text-bone p-6 flex flex-col justify-between">
            <div className="mono text-[10px] tracking-[0.25em] uppercase text-bone/50">cities live</div>
            <div className="serif text-7xl font-black leading-none">40<span className="text-signal">+</span></div>
            <div className="mono text-[10px] tracking-[0.2em] uppercase text-bone/60">↳ new every month</div>
          </BentoTile>

          {/* Long horizontal quote */}
          <BentoTile className="sm:col-span-3 lg:col-span-8 lg:row-span-1 bg-card p-6 flex flex-col sm:flex-row sm:items-center gap-6">
            <Avatar initials="PM" large />
            <div className="flex-1">
              <p className="serif text-xl sm:text-2xl leading-snug">
                <span className="text-signal">“</span>For our wedding week we ran <em className="not-italic font-bold">23 vehicles</em> across 4 cities through Rydex — zero spreadsheets, one invoice.<span className="text-signal">”</span>
              </p>
              <div className="mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mt-3">
                Priya M. · Event lead · Mumbai
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
    <div className={`shrink-0 grid place-items-center rounded-full hairline bg-bone text-ink serif font-bold ${size}`}>
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


function Protocol() {
  return (
    <section id="ride" className="relative">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 py-24">
        <div className="flex items-end justify-between mb-12 hairline-b pb-4">
          <div>
            <div className="mono text-[11px] tracking-[0.25em] uppercase text-signal mb-3">§04 — Field Protocol</div>
            <h2 className="serif text-5xl sm:text-7xl font-black leading-[0.9] tracking-tighter">
              Three moves<span className="text-signal">.</span> Always.
            </h2>
          </div>
          <div className="mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground hidden md:block">
            Plate 03 of 04 →
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-px bg-border hairline">
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
                <span className="serif text-5xl font-black italic">{p.n}</span>
                <span className="mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">step / {i + 1}.0</span>
              </div>
              <div className="mt-8 serif text-2xl font-bold tracking-tight">{p.title}</div>
              <p className="mt-3 text-sm leading-relaxed text-foreground/75 max-w-sm">{p.body}</p>
              <div className="mt-auto pt-6 tick h-px w-full" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── MANIFESTO ───────────────────────── */
function Manifesto() {
  return (
    <section className="relative">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 py-24 hairline-t">
        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-3 mono text-[11px] tracking-[0.25em] uppercase text-muted-foreground">
            §06 — Editor's Note
          </div>
          <div className="lg:col-span-9">
            <p className="serif text-3xl sm:text-5xl leading-[1.05] tracking-tight font-medium">
              <span className="text-foreground/30">“</span>The city is a machine of small movements. Rydex is the{" "}
              <em className="text-signal not-italic font-bold">connective tissue</em> — a single dispatch line wired through every wheel from a sandalwood-frame bicycle to a steel-framed freight cab. We don't build cars. We build the rhythm between them.<span className="text-foreground/30">”</span>
            </p>
            <div className="mt-8 mono text-[11px] tracking-[0.2em] uppercase text-muted-foreground">
              — Rydex Field Office, Mumbai · 2026
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── FOOTER ───────────────────────── */
function Foot() {
  const cols = [
    { t: "Product", l: ["Ride", "Drive", "Enterprise", "Fleet API", "Pricing"] },
    { t: "Company", l: ["About", "Careers", "Press", "Field Notes", "Contact"] },
    { t: "Legal", l: ["Privacy", "Terms", "Cookies", "Licenses", "Security"] },
  ];
  return (
    <footer className="brick text-bone">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8">
        {/* massive wordmark CTA */}
        <div className="py-16 hairline-b border-bone/15 relative">
          <div className="mono text-[11px] tracking-[0.25em] uppercase text-bone/60 mb-4">↳ End plate / Move on</div>
          <div className="flex items-end justify-between gap-6 flex-wrap">
            <h2 className="serif font-black leading-[0.82] tracking-[-0.05em] text-[68px] sm:text-[140px] lg:text-[200px]">
              Let's <span className="italic text-signal">go.</span>
            </h2>
            <a
              href="#"
              className="group inline-flex items-center gap-3 bg-bone text-ink pl-6 pr-2 py-2"
            >
              <span className="mono text-[12px] tracking-[0.2em] uppercase">Get the App</span>
              <span className="grid h-10 w-10 place-items-center brick">
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </a>
          </div>
        </div>

        {/* grid */}
        <div className="grid lg:grid-cols-[1.6fr_repeat(3,1fr)_1.4fr] gap-10 py-14 border-bone/15">
          <div>
            <div className="serif text-3xl font-black tracking-tighter">Rydex<span className="text-signal">™</span></div>
            <p className="mt-3 text-sm text-bone/70 max-w-xs leading-relaxed">
              A field-tested dispatch network for everything on wheels. Filed quarterly. Run continuously.
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.t}>
              <div className="mono text-[10px] tracking-[0.25em] uppercase text-bone/50 mb-4">{c.t}</div>
              <ul className="space-y-2.5">
                {c.l.map((x) => (
                  <li key={x}>
                    <a href="#" className="serif text-lg font-medium hover:text-signal transition-colors">
                      {x}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <div className="mono text-[10px] tracking-[0.25em] uppercase text-bone/50 mb-4">Subscribe / Field Notes</div>
            <form onSubmit={(e) => e.preventDefault()} className="flex border border-bone/30">
              <input
                placeholder="you@email.com"
                className="flex-1 bg-transparent px-3 py-3 mono text-sm placeholder:text-bone/40 outline-none"
              />
              <button className="px-4 brick bg-signal text-bone mono text-[11px] tracking-[0.2em] uppercase">
                Send →
              </button>
            </form>
            <p className="mt-3 mono text-[10px] tracking-[0.18em] uppercase text-bone/50">
              Dispatched first of every month.
            </p>
          </div>
        </div>

        {/* bottom bar */}
        <div className="py-5 hairline-t border-bone/15 flex flex-wrap items-center justify-between gap-3 mono text-[10px] tracking-[0.2em] uppercase text-bone/60">
          <span>© 2026 Rydex Mobility · all wheels reserved</span>
          <span className="flex items-center gap-4">
            <a href="#">Twitter / X</a>
            <a href="#">Instagram</a>
            <a href="#">LinkedIn</a>
            <a href="#">GitHub</a>
          </span>
          <span>Composed in Mumbai · printed on the web</span>
        </div>
      </div>
    </footer>
  );
}
