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
        <div className="py-16 border-b border-bone/15 relative">
          <div className="font-mono text-[11px] tracking-[0.25em] uppercase text-bone/60 mb-4">↳ End plate / Move on</div>
          <div className="flex items-end justify-between gap-6 flex-wrap">
            <h2 className="font-serif font-black leading-[0.82] tracking-[-0.05em] text-[68px] sm:text-[140px] lg:text-[200px]">
              Let's <span className="italic text-signal">go.</span>
            </h2>
            <a
              href="#"
              className="group inline-flex items-center gap-3 bg-bone text-ink pl-6 pr-2 py-2"
            >
              <span className="font-mono text-[12px] tracking-[0.2em] uppercase">Get the App</span>
              <span className="grid h-10 w-10 place-items-center brick">
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </a>
          </div>
        </div>

        {/* grid */}
        <div className="grid lg:grid-cols-[1.6fr_repeat(3,1fr)_1.4fr] gap-10 py-14 border-bone/15">
          <div>
            <div className="font-serif text-3xl font-black tracking-tighter">Rydex<span className="text-signal">™</span></div>
            <p className="mt-3 text-sm text-bone/70 max-w-xs leading-relaxed">
              A field-tested dispatch network for everything on wheels. Filed quarterly. Run continuously.
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.t}>
              <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-bone/50 mb-4">{c.t}</div>
              <ul className="space-y-2.5">
                {c.l.map((x) => (
                  <li key={x}>
                    <a href="#" className="font-serif text-lg font-medium hover:text-signal transition-colors">
                      {x}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-bone/50 mb-4">Subscribe / Field Notes</div>
            <form onSubmit={(e) => e.preventDefault()} className="flex border border-bone/30">
              <input
                placeholder="you@email.com"
                className="flex-1 bg-transparent px-3 py-3 font-mono text-sm placeholder:text-bone/40 outline-none"
              />
              <button className="px-4 brick bg-signal text-bone font-mono text-[11px] tracking-[0.2em] uppercase">
                Send →
              </button>
            </form>
            <p className="mt-3 font-mono text-[10px] tracking-[0.18em] uppercase text-bone/50">
              Dispatched first of every month.
            </p>
          </div>
        </div>

        {/* bottom bar */}
        <div className="py-5 border-t border-bone/15 flex flex-wrap items-center justify-between gap-3 font-mono text-[10px] tracking-[0.2em] uppercase text-bone/60">
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

export default Foot;
