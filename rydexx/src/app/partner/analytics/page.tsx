"use client";

import { motion } from "framer-motion";
import { PageHead, Panel } from "@/components/partner/shared";


const BARS = [12, 18, 9, 22, 17, 28, 24, 31, 19, 26, 33, 29, 21, 35];

export default function Analytics() {
  const max = Math.max(...BARS);
  return (
    <div className="space-y-6">
      <PageHead code="ANL / 04" title="Analytics Hub" subtitle="Performance telemetry · 14-day window" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          ["Trips", "97"],
          ["Acceptance", "92%"],
          ["Rating", "4.91"],
          ["On-Time", "88%"],
        ].map(([k, v]) => (
          <div key={k} className="hairline p-4 bg-card">
            <div className="mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground">{k}</div>
            <div className="serif text-[36px] font-black leading-none tracking-tighter mt-2">{v}</div>
          </div>
        ))}
      </div>
      <Panel code="CHRT / 01" title="Daily Trips · 14D">
        <div className="flex items-end gap-2 h-48 hairline-b pb-2">
          {BARS.map((b, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${(b / max) * 100}%` }}
              transition={{ delay: i * 0.04, ease: "easeOut" }}
              className="flex-1 bg-ink hover:bg-signal transition-colors"
            />
          ))}
        </div>
        <div className="flex justify-between mt-2 mono text-[9px] tracking-[0.22em] uppercase text-muted-foreground">
          <span>09 JUN</span><span>22 JUN</span>
        </div>
      </Panel>
    </div>
  );
}
