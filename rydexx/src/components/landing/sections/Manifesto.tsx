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

/* ───────────────────────── MANIFESTO ───────────────────────── */
function Manifesto() {
  return (
    <section className="relative">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 py-24 border-t border-border">
        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-3 font-mono text-[11px] tracking-[0.25em] uppercase text-muted-foreground">
            §06 — Editor's Note
          </div>
          <div className="lg:col-span-9">
            <p className="font-serif text-3xl sm:text-5xl leading-[1.05] tracking-tight font-medium">
              <span className="text-foreground/30">“</span>The city is a machine of small movements. Rydex is the{" "}
              <em className="text-signal not-italic font-bold">connective tissue</em> — a single dispatch line wired through every wheel from a sandalwood-frame bicycle to a steel-framed freight cab. We don't build cars. We build the rhythm between them.<span className="text-foreground/30">”</span>
            </p>
            <div className="mt-8 font-mono text-[11px] tracking-[0.2em] uppercase text-muted-foreground">
              — Rydex Field Office, Srinagar · 2026
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Manifesto;
