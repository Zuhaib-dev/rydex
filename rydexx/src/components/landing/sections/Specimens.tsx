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
          <h2 className="lg:col-span-9 serif font-black leading-[0.9] tracking-tighter text-5xl sm:text-7xl lg:text-8xl whitespace-nowrap">
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
        <span className="font-serif text-7xl font-black leading-none -mr-1">{v.n}</span>
      </div>

      <div className="mt-auto">
        <div className="font-serif text-3xl font-bold tracking-tight">{v.name}</div>
        <div className="mt-4 grid grid-cols-3 gap-2 font-mono text-[10px] tracking-[0.14em] uppercase">
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

export default Specimens;
