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
    { t: "Product", l: [ { label: "Ride", href: "/user/book" }, { label: "Fleet", href: "/fleet" }, { label: "Passes", href: "/pass" } ] },
    { t: "Company", l: [ { label: "About", href: "/about" }, { label: "Contact", href: "/contact" }, { label: "FAQ", href: "/faq" } ] },
    { t: "Legal", l: [ { label: "Privacy", href: "/privacy" }, { label: "Terms", href: "/terms" }, { label: "Security", href: "/settings/security" } ] },
  ];

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error();
      setStatus("success");
      setEmail("");
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };
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
                  <li key={x.label}>
                    <a href={x.href} className="font-serif text-lg font-medium hover:text-signal transition-colors">
                      {x.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-bone/50 mb-4">Subscribe / Field Notes</div>
            <form onSubmit={handleSubscribe} className="flex border border-bone/30 relative">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === "loading" || status === "success"}
                placeholder="you@email.com"
                className="flex-1 bg-transparent px-3 py-3 font-mono text-sm placeholder:text-bone/40 outline-none disabled:opacity-50"
              />
              <button 
                disabled={status === "loading" || status === "success"}
                className="px-4 brick bg-signal text-bone font-mono text-[11px] tracking-[0.2em] uppercase disabled:opacity-50 transition-colors"
              >
                {status === "loading" ? "..." : status === "success" ? "✓" : "Send →"}
              </button>
            </form>
            <p className="mt-3 font-mono text-[10px] tracking-[0.18em] uppercase text-bone/50 transition-colors">
              {status === "success" ? (
                <span className="text-signal">Subscribed successfully. Check your inbox!</span>
              ) : status === "error" ? (
                <span className="text-red-500">Failed to subscribe. Please try again.</span>
              ) : (
                "Dispatched first of every month."
              )}
            </p>
          </div>
        </div>

        {/* bottom bar */}
        <div className="py-5 border-t border-bone/15 flex flex-wrap items-center justify-between gap-3 font-mono text-[10px] tracking-[0.2em] uppercase text-bone/60">
          <span>© 2026 Rydex Mobility · all wheels reserved</span>
          <span className="flex items-center gap-4 flex-wrap">
            <a href="https://zuhaibrashid.com" target="_blank" rel="noreferrer" className="hover:text-signal transition-colors">Portfolio</a>
            <a href="https://x.com/xuhaib_x9" target="_blank" rel="noreferrer" className="hover:text-signal transition-colors">X / Twitter</a>
            <a href="https://www.linkedin.com/in/zuhaib-rashid-661345318/" target="_blank" rel="noreferrer" className="hover:text-signal transition-colors">LinkedIn</a>
            <a href="https://github.com/Zuhaib-dev" target="_blank" rel="noreferrer" className="hover:text-signal transition-colors">GitHub</a>
          </span>
          <span>Composed in Srinagar · printed on the web</span>
        </div>
      </div>
    </footer>
  );
}

export default Foot;
