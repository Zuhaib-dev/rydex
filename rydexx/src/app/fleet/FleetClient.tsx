"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Bike, CarTaxiFront, Car, Package, Truck, ArrowUpRight, Asterisk } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import Nav from "@/components/landing/sections/Nav";
import Foot from "@/components/landing/sections/Foot";
import Ticker from "@/components/landing/sections/Ticker";
import AuthModel from "@/components/AuthModel";

type Vehicle = {
  no: string; code: string; name: string; alias: string; icon: LucideIcon;
  base: string; payload: string; vmax: string; use: string; body: string;
  notes: string[]; status: "ACTIVE" | "LIMITED";
};

const fleet: Vehicle[] = [
  { no: "01", code: "BK-125", name: "Bike", alias: "Darter", icon: Bike,
    base: "₹30", payload: "10 kg / 1 pax", vmax: "85 km/h",
    use: "Last-mile darts across Lal Chowk lanes",
    body: "Single-cylinder, paper-light. Cuts the old city in half before lunch.",
    notes: ["Helmets issued · twin", "Rain-cape compartment", "Polo Ground → Boulevard · 6 min"],
    status: "ACTIVE" },
  { no: "02", code: "AT-3W", name: "Auto", alias: "Three-wheel", icon: CarTaxiFront,
    base: "₹45", payload: "60 kg / 3 pax", vmax: "60 km/h",
    use: "Inner-city hops · Residency Road → Rajbagh",
    body: "Yellow-roofed, indestructible. The municipal heartbeat.",
    notes: ["Metered + capped", "Card / UPI on-board", "Idles cleaner than last decade"],
    status: "ACTIVE" },
  { no: "03", code: "SD-XL6", name: "Sedan", alias: "Premium", icon: Car,
    base: "₹120", payload: "240 kg / 4 pax", vmax: "150 km/h",
    use: "Airport runs · Dal Lake Boulevard cruising",
    body: "Climate-controlled, leather-grade. The civil disguise of a daily driver.",
    notes: ["Twin USB-C / fast", "Bottled water · two", "SXR Terminal → Boulevard · 22 min"],
    status: "ACTIVE" },
  { no: "04", code: "SV-XL7", name: "SUV", alias: "Crew", icon: Package,
    base: "₹180", payload: "420 kg / 6 pax", vmax: "140 km/h",
    use: "Crew transfers · Gulmarg & Pahalgam runs",
    body: "Three rows, full-time AWD. Built to clear winter switchbacks without flinching.",
    notes: ["Roof rails · 75 kg", "Snow-rated tyres Nov–Mar", "Child seat on request"],
    status: "ACTIVE" },
  { no: "05", code: "FR-10T", name: "10-Tonne Truck", alias: "Freight", icon: Truck,
    base: "₹2,400", payload: "10,000 kg", vmax: "90 km/h",
    use: "Inter-valley freight · SXR ↔ Jammu corridor",
    body: "Hydraulic tail-lift, GPS-anchored. Hauls the things nobody photographs.",
    notes: ["E-way bill on dispatch", "Cold-box add-on", "Pallet jack on-board"],
    status: "LIMITED" },
];

export default function FleetClient() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authRedirect, setAuthRedirect] = useState("/");

  const openAuth = (redirectUrl: string = "/") => {
    if (typeof redirectUrl === 'string') {
      setAuthRedirect(redirectUrl);
    } else {
      setAuthRedirect("/");
    }
    setAuthOpen(true);
  };

  return (
    <div className="facelift-landing min-h-screen overflow-x-hidden bg-background text-foreground">
      <Ticker />
      <Nav onAuthRequired={openAuth} />

      <section className="mx-auto max-w-[1400px] px-5 sm:px-8 pt-10 sm:pt-16 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-3 gap-x-6 mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground border-b border-border pb-4 mb-10">
          <Meta k="Filed" v="22.06.26 / SXR" />
          <Meta k="Volume" v="N° 04 — Fleet" />
          <Meta k="Classes" v="5 active" />
          <Meta k="Coverage" v="Srinagar valley" />
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-end">
          <div className="lg:col-span-9">
            <div className="mono text-[11px] tracking-[0.25em] uppercase text-signal mb-5 flex items-center gap-2">
              <Asterisk className="h-3 w-3" /> Chapter Four — The Fleet Ledger
            </div>
            <h1 className="serif font-black leading-[0.86] tracking-[-0.045em] text-[58px] sm:text-[88px] lg:text-[120px]">
              Every <span className="italic text-signal">wheel</span><br />
              we put<br />on the road<span className="text-signal">.</span>
            </h1>
          </div>
          <div className="lg:col-span-3">
            <p className="serif text-xl leading-snug">
              A mechanical catalogue, filed in five classes — from a <u className="decoration-signal decoration-2 underline-offset-4">₹30 darter</u> to a <u className="decoration-signal decoration-2 underline-offset-4">10-tonne hauler</u>. Specced raw, no rounding.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 sm:px-8">
        <div className="border-t border-b border-border py-3 grid grid-cols-[60px_1fr_120px] sm:grid-cols-[60px_1fr_120px_140px_120px_120px] gap-4 mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground">
          <span>N°</span><span>Vehicle</span>
          <span className="text-right">Base fare</span>
          <span className="hidden sm:block text-right">Payload</span>
          <span className="hidden sm:block text-right">V-Max</span>
          <span className="hidden sm:block text-right">Status</span>
        </div>
        {fleet.map((v, i) => <FleetRow key={v.code} v={v} i={i} />)}
      </section>

      <section className="mx-auto max-w-[1400px] px-5 sm:px-8 py-16">
        <div className="border border-border brick text-bone p-8 sm:p-10 grid lg:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <div className="mono text-[10px] tracking-[0.25em] uppercase text-bone/60 mb-3">↳ Operator note</div>
            <p className="serif text-2xl sm:text-3xl leading-snug max-w-3xl">
              Every class runs the same dispatch terminal. Different chassis, identical promise: <span className="italic text-signal">on time, on the meter, on the record.</span>
            </p>
          </div>
          <Link href="/contact" className="group inline-flex items-center gap-3 bg-bone text-ink pl-6 pr-2 py-2 shrink-0">
            <span className="mono text-[12px] tracking-[0.2em] uppercase">Dispatch us</span>
            <span className="grid h-10 w-10 place-items-center brick">
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          </Link>
        </div>
      </section>

      <Foot />

      <AuthModel
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        redirectTo={authRedirect}
      />
    </div>
  );
}

function FleetRow({ v, i }: { v: Vehicle; i: number }) {
  const Icon = v.icon;
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay: i * 0.05 }}
      className="border-b border-border py-8 sm:py-10 grid sm:grid-cols-[60px_1fr_120px_140px_120px_120px] gap-4 items-start"
    >
      <div className="mono text-[11px] tracking-[0.22em] uppercase text-muted-foreground">
        {v.no}<div className="mt-2 hidden sm:block text-[9px]">{v.code}</div>
      </div>

      <div className="grid sm:grid-cols-[80px_1fr] gap-5 items-start">
        <div className="border border-border aspect-square w-20 grid place-items-center tick relative">
          <Icon className="h-9 w-9" strokeWidth={1.5} />
          {/* tick marks */}
          <div className="absolute top-0 left-0 w-1 h-1 border-t border-l border-foreground" />
          <div className="absolute top-0 right-0 w-1 h-1 border-t border-r border-foreground" />
          <div className="absolute bottom-0 left-0 w-1 h-1 border-b border-l border-foreground" />
          <div className="absolute bottom-0 right-0 w-1 h-1 border-b border-r border-foreground" />
        </div>
        <div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <h3 className="serif text-3xl sm:text-4xl font-black leading-none tracking-tighter">{v.name}</h3>
            <span className="mono text-[10px] tracking-[0.22em] uppercase text-signal">/ {v.alias}</span>
          </div>
          <p className="serif text-base sm:text-lg mt-2 leading-snug max-w-xl">{v.body}</p>
          <div className="mt-3 mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">Use · {v.use}</div>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
            {v.notes.map((n) => (
              <li key={n} className="flex items-center gap-2"><span className="text-signal">●</span> {n}</li>
            ))}
          </ul>
          <div className="sm:hidden mt-4 grid grid-cols-3 border-t border-border pt-3 mono text-[10px] tracking-[0.18em] uppercase">
            <SpecMini k="Base" v={v.base} />
            <SpecMini k="Payload" v={v.payload} />
            <SpecMini k="V-Max" v={v.vmax} />
          </div>
        </div>
      </div>

      <div className="hidden sm:block text-right">
        <div className="serif text-3xl font-black leading-none">{v.base}</div>
        <div className="mono text-[9px] tracking-[0.22em] uppercase text-muted-foreground mt-1">/ base fare</div>
      </div>
      <div className="hidden sm:block text-right mono text-[11px] tracking-wide">{v.payload}</div>
      <div className="hidden sm:block text-right mono text-[11px] tracking-wide">{v.vmax}</div>
      <div className="hidden sm:flex sm:justify-end">
        <span className={`mono text-[10px] tracking-[0.22em] uppercase px-2 py-1 border border-border ${
          v.status === "ACTIVE" ? "bg-signal text-bone border-signal" : "bg-background"
        }`}>{v.status}</span>
      </div>
    </motion.article>
  );
}

function SpecMini({ k, v }: { k: string; v: string }) {
  return (<div><div className="text-muted-foreground">{k}</div><div className="mt-1">{v}</div></div>);
}
function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-foreground/40">{k}</span><span>—</span><span className="text-foreground">{v}</span>
    </div>
  );
}
