"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Asterisk, MapPin, Phone, Mail, Clock } from "lucide-react";
import Nav from "@/components/landing/sections/Nav";
import Foot from "@/components/landing/sections/Foot";
import Ticker from "@/components/landing/sections/Ticker";
import AuthModel from "@/components/AuthModel";

export default function ContactClient() {
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
          <Meta k="Desk" v="Dispatch / 03" />
          <Meta k="Channel" v="Encrypted" />
          <Meta k="Response" v="< 4 hrs" />
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-end">
          <div className="lg:col-span-9">
            <div className="mono text-[11px] tracking-[0.25em] uppercase text-signal mb-5 flex items-center gap-2">
              <Asterisk className="h-3 w-3" /> Chapter Three — The Field Office
            </div>
            <h1 className="serif font-black leading-[0.86] tracking-[-0.045em] text-[58px] sm:text-[88px] lg:text-[124px]">
              Raise a <span className="italic text-signal">dispatch</span><br />ticket<span className="text-signal">.</span>
            </h1>
          </div>
          <div className="lg:col-span-3">
            <p className="serif text-xl leading-snug">
              Logged at <u className="decoration-signal decoration-2 underline-offset-4">Residency Road</u>, routed within four hours. Plain English. No tickets-for-tickets.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 sm:px-8 pb-16 grid lg:grid-cols-[1.4fr_1fr] gap-8">
        <ContactForm />
        <FieldOfficeCard />
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

type Status = "idle" | "sending" | "filed";

function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [formData, setFormData] = useState({ name: "", email: "", dispatchId: "", subject: "", message: "" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status !== "idle") return;
    setStatus("sending");
    
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setStatus("filed");
        setFormData({ name: "", email: "", dispatchId: "", subject: "", message: "" });
      } else {
        setStatus("idle");
        alert("Failed to file dispatch ticket. Please check your inputs.");
      }
    } catch (error) {
      console.error(error);
      setStatus("idle");
      alert("Network error. Could not file dispatch ticket.");
    }
  }

  return (
    <form onSubmit={submit} className="border border-border bg-card relative">
      <div className="brick mono text-[10px] tracking-[0.22em] uppercase py-2 px-4 flex items-center justify-between text-bone">
        <span className="flex items-center gap-2">
          <span className="text-signal animate-blink">●</span> Dispatch desk · Form N° 03
        </span>
        <span className="text-bone/60">SXR / 24H</span>
      </div>

      <div className="p-6 sm:p-8 grid sm:grid-cols-2 gap-5">
        <Field label="Operator name" placeholder="Yusuf Bhat" value={formData.name} onChange={(v) => setFormData({...formData, name: v})} required />
        <Field label="Email" type="email" placeholder="yusuf@example.com" value={formData.email} onChange={(v) => setFormData({...formData, email: v})} required />
        <Field label="Dispatch ID (opt.)" placeholder="RYDX-00481" value={formData.dispatchId} onChange={(v) => setFormData({...formData, dispatchId: v})} />
        <div className="sm:col-span-2">
          <Field label="Subject" placeholder="Late dispatch · Boulevard run" value={formData.subject} onChange={(v) => setFormData({...formData, subject: v})} required />
        </div>
        <div className="sm:col-span-2">
          <label className="block">
            <span className="mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground block mb-1.5">Message</span>
            <textarea rows={6} placeholder="File the incident. Time, route, vehicle code — all helpful." required
              value={formData.message} onChange={(e) => setFormData({...formData, message: e.target.value})}
              className="w-full border border-border bg-background px-3 py-2.5 mono text-[12px] tracking-wide focus:outline-none focus:border-signal focus:ring-1 focus:ring-signal transition-colors placeholder:text-muted-foreground/60 resize-none text-foreground" />
          </label>
        </div>
      </div>

      <div className="border-t border-border p-6 sm:p-8 flex items-center justify-between gap-4 flex-wrap">
        <p className="mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground max-w-md">
          By filing, you accept our dispatch protocol. No spam. Audit-logged for 90 days.
        </p>

        <motion.button type="submit" disabled={status !== "idle"} whileTap={{ scale: 0.98 }}
          className={`group inline-flex items-center gap-3 pl-5 pr-2 py-2 mono text-[12px] tracking-[0.2em] uppercase transition-colors ${
            status === "filed" ? "bg-signal text-bone" : "bg-signal text-bone"
          } ${status !== "idle" ? "cursor-default opacity-80" : "cursor-pointer hover:bg-ink"}`}>
          {status === "idle" && (<>
            <span>File Dispatch</span>
            <span className="grid h-9 w-9 place-items-center bg-bone text-ink">
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          </>)}
          {status === "sending" && (<>
            <span className="flex items-center gap-2"><span className="h-2 w-2 bg-bone animate-blink" />Transmitting…</span>
            <span className="grid h-9 w-9 place-items-center bg-bone text-ink">
              <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="h-3 w-3 border-2 border-ink border-t-transparent rounded-full" />
            </span>
          </>)}
          {status === "filed" && (<>
            <span>Filed Successfully</span>
            <span className="grid h-9 w-9 place-items-center bg-ink text-bone">✓</span>
          </>)}
        </motion.button>
      </div>

      <div className="h-2 tick" />
    </form>
  );
}

function Field({ label, placeholder, type = "text", value, onChange, required = false }: { label: string; placeholder: string; type?: string; value: string; onChange: (v: string) => void; required?: boolean; }) {
  return (
    <label className="block">
      <span className="mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground block mb-1.5">{label}</span>
      <input type={type} placeholder={placeholder} required={required}
        value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full border border-border bg-background px-3 py-2.5 mono text-[12px] tracking-wide focus:outline-none focus:border-signal focus:ring-1 focus:ring-signal transition-colors placeholder:text-muted-foreground/60 text-foreground" />
    </label>
  );
}

function FieldOfficeCard() {
  return (
    <aside className="space-y-4">
      <div className="border border-border bg-card">
        <div className="brick mono text-[10px] tracking-[0.22em] uppercase py-2 px-4 flex items-center justify-between text-bone">
          <span>HQ · Field Office</span><span className="text-bone/60">N° 001</span>
        </div>

        <div className="p-6 sm:p-7">
          <div className="mono text-[10px] tracking-[0.22em] uppercase text-signal mb-2">↳ Live network status</div>
          <div className="flex items-center gap-3 mb-5">
            <span className="h-2.5 w-2.5 rounded-full bg-signal animate-blink" />
            <span className="serif text-2xl font-black tracking-tight">Operational</span>
            <span className="ml-auto mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground">12,402 online</span>
          </div>

          <div className="border-t border-border pt-5 space-y-4">
            <Line icon={MapPin}>Rydex HQ / Field Office<br />Residency Road, Srinagar 190001<br />Jammu & Kashmir, India</Line>
            <Line icon={Phone}>+91 194 555 0142</Line>
            <Line icon={Mail}>dispatch@rydex.in</Line>
            <Line icon={Clock}>Desk · 06:00 – 23:00 IST · Net 24/7</Line>
          </div>
        </div>

        <div className="h-2 tick" />
      </div>

      <div className="border border-border p-5 bg-background">
        <div className="mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-2">Sector coverage</div>
        <ul className="grid grid-cols-2 gap-y-1.5 serif text-base">
          <li>Lal Chowk</li><li>Dal Boulevard</li><li>Residency Road</li><li>Rajbagh</li>
          <li>Sonwar</li><li>Hazratbal</li><li>SXR Terminal</li><li>Pampore Bypass</li>
        </ul>
      </div>

      <div className="brick text-bone p-5">
        <div className="mono text-[10px] tracking-[0.22em] uppercase text-bone/60 mb-2">Emergency channel</div>
        <p className="serif text-lg leading-snug">
          For in-trip incidents, hit the <span className="text-signal">SOS</span> tile in the app. It pages a human operator inside 30 seconds.
        </p>
      </div>
    </aside>
  );
}

function Line({ icon: Icon, children }: { icon: typeof MapPin; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 mt-1 text-signal shrink-0" strokeWidth={1.5} />
      <div className="serif text-base leading-snug">{children}</div>
    </div>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-foreground/40">{k}</span><span>—</span><span className="text-foreground">{v}</span>
    </div>
  );
}
