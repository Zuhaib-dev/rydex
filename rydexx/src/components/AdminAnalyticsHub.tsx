"use client";

import { motion } from "framer-motion";
import { PageHead, Panel } from "@/components/partner/shared";

const BARS_REV = [42, 58, 36, 71, 64, 88, 95, 73, 81, 62, 54, 90, 76, 84];
const BARS_DRV = [60, 64, 70, 68, 75, 80, 78, 84, 90, 88, 82, 86, 92, 95];

const METRICS = [
  { code: "M-01", label: "Revenue · 30D", value: "₹38,42,109", delta: "+18.2%" },
  { code: "M-02", label: "Active Drivers", value: "1,884", delta: "+92" },
  { code: "M-03", label: "Cancellation Rate", value: "4.7%", delta: "-0.8%" },
  { code: "M-04", label: "Avg Trip Value", value: "₹312", delta: "+₹14" },
  { code: "M-05", label: "Repeat Riders", value: "62.4%", delta: "+3.1%" },
  { code: "M-06", label: "Surge Hours", value: "142h", delta: "+12h" },
];

export default function Analytics() {
  return (
    <div className="space-y-6">
      <PageHead code="ADM / 01" title="Advanced Analytics" subtitle="Structural readouts · model R-04 · refreshed every 60s" />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {METRICS.map((m, i) => (
          <motion.div
            key={m.code}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="hairline bg-card p-4"
          >
            <div className="mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground">{m.code} · {m.label}</div>
            <div className="serif italic text-[34px] font-black leading-none tracking-tighter mt-3">{m.value}</div>
            <div className="mono text-[10px] tracking-[0.22em] uppercase text-signal mt-2">▲ {m.delta}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <BarPanel code="CHT / 02" title="Revenue · 14 day blocks" data={BARS_REV} unit="₹k" />
        <BarPanel code="CHT / 03" title="Active Drivers · 14 day blocks" data={BARS_DRV} unit="drv" />
      </div>

      <Panel code="GRD / 04" title="Region Performance Matrix">
        <div className="overflow-x-auto">
          <table className="w-full mono text-[11px]">
            <thead>
              <tr className="hairline-b text-left text-muted-foreground tracking-[0.18em] uppercase text-[9px]">
                <th className="py-2 px-2">Region</th><th className="py-2 px-2">Trips</th><th className="py-2 px-2">Revenue</th><th className="py-2 px-2">Cancel</th><th className="py-2 px-2">Surge</th><th className="py-2 px-2 text-right">Index</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Lal Chowk", "4,210", "₹6,12,300", "3.1%", "12h", "0.94"],
                ["SXR Airport", "2,118", "₹9,84,210", "2.4%", "38h", "0.98"],
                ["Dal Gate", "1,902", "₹3,11,400", "5.8%", "6h", "0.81"],
                ["Rajbagh", "1,640", "₹2,18,900", "4.2%", "4h", "0.86"],
                ["Hazratbal", "1,201", "₹1,72,500", "6.9%", "2h", "0.74"],
              ].map((r) => (
                <tr key={r[0]} className="hairline-b hover:bg-ink hover:text-bone transition-colors">
                  {r.map((c, i) => (
                    <td key={i} className={`py-2.5 px-2 ${i === 0 ? "serif text-[14px]" : ""} ${i === 5 ? "text-right text-signal" : ""}`}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function BarPanel({ code, title, data, unit }: { code: string; title: string; data: number[]; unit: string }) {
  const max = Math.max(...data);
  return (
    <Panel code={code} title={title}>
      <div className="flex items-end gap-1.5 h-48 hairline-b pb-1">
        {data.map((v, i) => (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            animate={{ height: `${(v / max) * 100}%` }}
            transition={{ delay: i * 0.03, duration: 0.5 }}
            className="flex-1 bg-ink hover:bg-signal transition-colors relative group"
          >
            <span className="absolute -top-5 left-1/2 -translate-x-1/2 mono text-[9px] opacity-0 group-hover:opacity-100">{v}</span>
          </motion.div>
        ))}
      </div>
      <div className="flex justify-between mono text-[9px] tracking-[0.22em] uppercase text-muted-foreground mt-2">
        <span>D-14</span><span>{unit}</span><span>TODAY</span>
      </div>
    </Panel>
  );
}
