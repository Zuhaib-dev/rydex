"use client";

import { PageHead, Panel } from "@/components/partner/shared";


const SPECS = [
  ["Make / Model", "Toyota Fortuner"],
  ["Plate", "JK04K9999"],
  ["Class", "SUV / 04"],
  ["Year", "2022"],
  ["Fuel", "Diesel · 2.8 L"],
  ["Seats", "7"],
  ["Insurance", "Active · Exp 12 / 2026"],
  ["Permit", "Commercial · J&K"],
  ["Odometer", "48,221 km"],
  ["Last Service", "12 JUN · 2026"],
];

export default function Vehicle() {
  return (
    <div className="space-y-6">
      <PageHead code="VEH / 03" title="My Vehicle" subtitle="Active dispatch unit · Service log & papers" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Panel code="UNIT / 01" title="Active Vehicle" className="lg:col-span-2">
          <div className="serif text-[56px] font-black leading-none tracking-tighter">Fortuner</div>
          <div className="mono text-[11px] tracking-[0.22em] uppercase text-muted-foreground mt-2">Plate · JK04K9999</div>
          <div className="mt-5 grid grid-cols-2 gap-x-6">
            {SPECS.map(([k, v]) => (
              <div key={k} className="hairline-b py-2 flex items-center justify-between mono text-[11px] tracking-[0.15em] uppercase">
                <span className="text-muted-foreground">{k}</span>
                <span className="text-foreground">{v}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel code="STAT / 02" title="Compliance">
          <div className="space-y-3">
            {["Insurance · OK", "Permit · OK", "PUC · OK", "Fitness · OK"].map((s) => (
              <div key={s} className="hairline p-3 flex items-center justify-between mono text-[11px] tracking-[0.18em] uppercase">
                <span>{s}</span>
                <span className="signal-chip px-1.5 py-0.5 text-[9px]">CLEAR</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
