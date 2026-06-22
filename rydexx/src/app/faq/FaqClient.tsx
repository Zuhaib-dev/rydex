"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Asterisk, Plus, Minus, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import Nav from "@/components/landing/sections/Nav";
import Foot from "@/components/landing/sections/Foot";
import Ticker from "@/components/landing/sections/Ticker";
import AuthModel from "@/components/AuthModel";

type Entry = {
  no: string; term: string; short: string; body: string;
  meta: { k: string; v: string }[];
  section: "PRICING" | "OPERATIONS" | "ENTERPRISE" | "PARTNERS";
};

const entries: Entry[] = [
  { no: "§ 01", term: "Surge Pricing", short: "Capped strictly at +18% over base fare.",
    body: "Demand multipliers exist — they do not exceed 1.18×. The cap is hard-coded into the dispatch terminal; no operator override. When valley-wide events spike demand (Eid, snowfall, airport closures), we add capacity instead of price.",
    meta: [{ k: "Ceiling", v: "+18%" }, { k: "Review", v: "Quarterly" }], section: "PRICING" },
  { no: "§ 02", term: "Cancellations", short: "Free under 90 seconds. After that, a flat ₹20 reaches the driver.",
    body: "The first ninety seconds are yours — change your mind, fix the pickup pin, jump in a friend's car. After that the driver has already left their last drop. The fee compensates fuel and lost positioning, paid to the partner, not the platform.",
    meta: [{ k: "Grace", v: "90 sec" }, { k: "Fee", v: "₹20 flat" }], section: "OPERATIONS" },
  { no: "§ 03", term: "Enterprise Billing", short: "Net-15 invoicing, single PDF, GSTIN-tagged.",
    body: "Corporate accounts roll every ride into one monthly invoice, broken down by employee, cost center, and route. Paid via NEFT or corporate UPI. Disputes opened inside seven days are auto-credited; we'll argue with ourselves later.",
    meta: [{ k: "Terms", v: "Net-15" }, { k: "Minimum", v: "₹40,000 / mo" }], section: "ENTERPRISE" },
  { no: "§ 04", term: "Partner Payouts", short: "Daily settlements, 06:00 IST, no minimum balance.",
    body: "Earnings clear into the partner's linked account every morning at six. There is no held balance, no weekly wait, no withdrawal request. Bike and auto partners typically see funds by breakfast; truck partners by the time they're back in the cab.",
    meta: [{ k: "Frequency", v: "Daily" }, { k: "Held", v: "₹0" }], section: "PARTNERS" },
  { no: "§ 05", term: "Lost & Found", short: "48-hour return guarantee within Srinagar limits.",
    body: "If you leave a phone, bag, or stack of files in a Rydex vehicle, file from the trip detail in the app. The vehicle is located via GPS, the partner is paged, and the item is returned to the Residency Road desk within 48 hours. A ₹100 courtesy is paid to the partner from our pocket — never yours.",
    meta: [{ k: "Window", v: "48 hrs" }, { k: "Cost", v: "Free to rider" }], section: "OPERATIONS" },
  { no: "§ 06", term: "Pricing Transparency", short: "Fare shown up front. No post-trip recalculation.",
    body: "The number you see when you book is the number you pay — barring toll variation, which is itemised. Waiting time over five minutes is metered and shown live. There are no booking fees, no platform fees, no convenience fees.",
    meta: [{ k: "Visibility", v: "Pre-trip" }, { k: "Hidden", v: "None" }], section: "PRICING" },
  { no: "§ 07", term: "Driver Vetting", short: "RTO check, criminal background, valley-route exam.",
    body: "Every partner driver clears a three-stage vet: RTO licence verification, a state-issued background certificate, and a 40-question route exam covering the Boulevard, Old City, airport corridor, and winter alternates. Re-certification annually.",
    meta: [{ k: "Stages", v: "3" }, { k: "Renew", v: "12 months" }], section: "PARTNERS" },
  { no: "§ 08", term: "Enterprise SLA", short: "Pickup inside 7 minutes, 95% of the time, weekday hours.",
    body: "Corporate contracts include a service guarantee: in business hours, 95 out of 100 dispatches arrive at the pickup pin inside seven minutes. Breaches are auto-credited at 2× the affected fare and reported in the monthly invoice — no need to chase.",
    meta: [{ k: "Target", v: "7 min" }, { k: "Hit-rate", v: "95%" }], section: "ENTERPRISE" },
];

const sections: Entry["section"][] = ["PRICING", "OPERATIONS", "ENTERPRISE", "PARTNERS"];

export default function FaqClient() {
  const [filter, setFilter] = useState<"ALL" | Entry["section"]>("ALL");
  const list = filter === "ALL" ? entries : entries.filter((e) => e.section === filter);

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
          <Meta k="Manual" v="Protocol / 04" />
          <Meta k="Entries" v={`${entries.length} clauses`} />
          <Meta k="Revision" v="r.04.22" />
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-end">
          <div className="lg:col-span-9">
            <div className="mono text-[11px] tracking-[0.25em] uppercase text-signal mb-5 flex items-center gap-2">
              <Asterisk className="h-3 w-3" /> Chapter Four — The Protocol Manual
            </div>
            <h1 className="serif font-black leading-[0.86] tracking-[-0.045em] text-[58px] sm:text-[88px] lg:text-[124px]">
              How the<br /><span className="italic text-signal">network</span> actually<br />works<span className="text-signal">.</span>
            </h1>
          </div>
          <div className="lg:col-span-3">
            <p className="serif text-xl leading-snug">
              A clause-by-clause dictionary of the rules we ship under. No fine print; we set the font size ourselves.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 sm:px-8">
        <div className="border-t border-b border-border py-3 flex items-center gap-2 flex-wrap mono text-[10px] tracking-[0.22em] uppercase">
          <span className="text-muted-foreground mr-3">Filter ·</span>
          {(["ALL", ...sections] as const).map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1 border border-border transition-colors cursor-pointer ${
                filter === s ? "bg-signal text-bone border-signal" : "hover:bg-secondary"
              }`}>{s}</button>
          ))}
          <span className="ml-auto text-muted-foreground">{list.length} entries</span>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 sm:px-8 pb-16">
        {list.map((e, i) => <Clause key={e.no} entry={e} index={i} />)}
      </section>

      <section className="mx-auto max-w-[1400px] px-5 sm:px-8 pb-20">
        <div className="border border-border brick text-bone p-8 sm:p-10 grid lg:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <div className="mono text-[10px] tracking-[0.25em] uppercase text-bone/60 mb-3">↳ Clause not listed?</div>
            <p className="serif text-2xl sm:text-3xl leading-snug max-w-3xl">
              File a question at the field desk — we publish answers back here, with a stamp and a date.
            </p>
          </div>
          <Link href="/contact" className="group inline-flex items-center gap-3 bg-bone text-ink pl-6 pr-2 py-2 shrink-0">
            <span className="mono text-[12px] tracking-[0.2em] uppercase">Ask the desk</span>
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

function Clause({ entry, index }: { entry: Entry; index: number }) {
  const [open, setOpen] = useState(index === 0);
  return (
    <motion.article layout
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.3) }}
      className="border-b border-border">
      <button onClick={() => setOpen((o) => !o)}
        className="w-full text-left py-7 grid grid-cols-[64px_1fr_auto] sm:grid-cols-[80px_1fr_140px_auto] gap-4 sm:gap-6 items-start cursor-pointer group">
        <span className="mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground pt-2">{entry.no}</span>
        <div>
          <h3 className="serif text-3xl sm:text-4xl font-black leading-none tracking-tighter group-hover:text-signal transition-colors">
            {entry.term}
          </h3>
          <p className="serif text-base sm:text-lg mt-2 max-w-2xl leading-snug text-muted-foreground">{entry.short}</p>
        </div>
        <span className="hidden sm:inline-flex items-center mono text-[10px] tracking-[0.22em] uppercase text-signal pt-2">· {entry.section}</span>
        <span className="border border-border h-9 w-9 grid place-items-center mt-1 group-hover:bg-signal group-hover:text-bone group-hover:border-signal transition-colors">
          {open ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden">
            <div className="pb-8 pl-0 sm:pl-[104px] grid lg:grid-cols-[1fr_280px] gap-6">
              <p className="serif text-lg sm:text-xl leading-relaxed max-w-3xl">{entry.body}</p>
              <div className="border border-border p-4 bg-card h-fit">
                <div className="mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-3">Stamped spec</div>
                <ul className="space-y-2">
                  {entry.meta.map((m) => (
                    <li key={m.k} className="flex items-baseline justify-between mono text-[11px] tracking-wide">
                      <span className="text-muted-foreground uppercase tracking-[0.18em] text-[10px]">{m.k}</span>
                      <span className="text-foreground">{m.v}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-foreground/40">{k}</span><span>—</span><span className="text-foreground">{v}</span>
    </div>
  );
}
