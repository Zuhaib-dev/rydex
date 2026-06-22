"use client";

import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { PageHead, Panel } from "@/components/partner/shared";


const ZONES = [
  { name: "Lal Chowk", heat: 95, dist: "17.8 km N" },
  { name: "SXR Airport", heat: 78, dist: "12.4 km S" },
  { name: "Dal Gate", heat: 64, dist: "8.1 km NE" },
  { name: "Hazratbal", heat: 51, dist: "10.2 km N" },
  { name: "Rajbagh", heat: 42, dist: "3.6 km W" },
  { name: "Nishat", heat: 33, dist: "11.5 km E" },
];

export default function Demand() {
  return (
    <div className="space-y-6">
      <PageHead code="MAP / 06" title="Live Demand Map" subtitle="Heat sectors refreshed every 30s · Srinagar grid" />
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5">
        <Panel code="GRID / 01" title="Heat Surface">
          <div className="relative aspect-[4/3] hairline bg-background overflow-hidden">
            <div className="absolute inset-0 tick opacity-40" />
            <div className="absolute inset-0" style={{ backgroundImage: "repeating-linear-gradient(0deg, var(--color-border) 0 1px, transparent 1px 32px)" }} />
            {ZONES.map((z, i) => (
              <motion.div
                key={z.name}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.08 }}
                className="absolute"
                style={{
                  left: `${15 + i * 13}%`,
                  top: `${20 + (i % 3) * 22}%`,
                }}
              >
                <div
                  className="rounded-full bg-signal/30 animate-blink"
                  style={{ width: z.heat / 2, height: z.heat / 2 }}
                />
                <div className="absolute top-0 left-0 w-2 h-2 bg-signal -translate-x-1/2 -translate-y-1/2" />
                <div className="mono text-[9px] tracking-[0.18em] uppercase mt-2 whitespace-nowrap">{z.name}</div>
              </motion.div>
            ))}
            <div className="absolute bottom-3 left-3 mono text-[9px] tracking-[0.22em] uppercase bg-ink text-bone px-2 py-1">
              SXR · 34.08°N · LIVE
            </div>
          </div>
        </Panel>
        <Panel code="RNK / 02" title="Top Sectors">
          {ZONES.map((z, i) => (
            <div key={z.name} className="hairline-b py-3 grid grid-cols-[24px_1fr_auto] items-center gap-3">
              <span className="mono text-[10px] text-signal">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <div className="serif text-[18px] font-black leading-tight tracking-tight flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-signal" />{z.name}
                </div>
                <div className="mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">{z.dist}</div>
              </div>
              <div className="w-20">
                <div className="hairline h-2 bg-background overflow-hidden">
                  <div className="h-full bg-signal" style={{ width: `${z.heat}%` }} />
                </div>
                <div className="mono text-[9px] tracking-[0.18em] uppercase text-right mt-1">{z.heat}</div>
              </div>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  );
}
