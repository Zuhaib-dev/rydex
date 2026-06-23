"use client";

import { motion } from "framer-motion";
import { PageHead, Panel } from "@/components/partner/shared";

const TRACES = [
  { id: "TRC-9821", op: "POST /v1/rides", dur: 142, spans: 8, status: "ok" },
  { id: "TRC-9822", op: "GET /v1/me", dur: 11, spans: 2, status: "ok" },
  { id: "TRC-9823", op: "POST /v1/payments", dur: 412, spans: 14, status: "slow" },
  { id: "TRC-9824", op: "WS dispatch.assign", dur: 22, spans: 5, status: "ok" },
  { id: "TRC-9825", op: "POST /v1/rides", dur: 98, spans: 8, status: "ok" },
];

const SERIES = [12, 18, 14, 22, 19, 28, 32, 25, 21, 30, 36, 28, 24, 31, 38, 41, 33, 29, 35, 42];

export default function Observability() {
  return (
    <div className="space-y-6">
      <PageHead code="ADM / 10" title="Observability Hub" subtitle="Traces · metrics · logs · 1.2M events/hr" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { l: "Req/sec", v: "1,884" },
          { l: "P50 Lat", v: "42ms" },
          { l: "P95 Lat", v: "186ms" },
          { l: "Error Rate", v: "0.04%" },
        ].map((m) => (
          <div key={m.l} className="hairline bg-card p-4">
            <div className="mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground">{m.l}</div>
            <div className="serif italic text-[34px] font-black leading-none tracking-tighter mt-3">{m.v}</div>
          </div>
        ))}
      </div>

      <Panel code="TS / 10" title="Request Rate · 20m window">
        <div className="flex items-end gap-1.5 h-40 hairline-b pb-1">
          {SERIES.map((v, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${(v / Math.max(...SERIES)) * 100}%` }}
              transition={{ delay: i * 0.02, duration: 0.4 }}
              className="flex-1 bg-ink hover:bg-signal transition-colors"
            />
          ))}
        </div>
        <div className="flex justify-between mono text-[9px] tracking-[0.22em] uppercase text-muted-foreground mt-2">
          <span>-20m</span><span>req/s</span><span>NOW</span>
        </div>
      </Panel>

      <Panel code="TRC / 10" title="Recent Traces">
        <div className="overflow-x-auto">
          <table className="w-full mono text-[11px]">
            <thead>
              <tr className="hairline-b text-left text-muted-foreground tracking-[0.18em] uppercase text-[9px]">
                <th className="py-2 px-2">TRC_ID</th><th className="py-2 px-2">Operation</th><th className="py-2 px-2">Duration</th><th className="py-2 px-2">Spans</th><th className="py-2 px-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {TRACES.map((t) => (
                <tr key={t.id} className="hover:bg-ink hover:text-bone transition-colors group">
                  <td className="py-2.5 px-2 text-signal">{t.id}</td>
                  <td className="py-2.5 px-2 serif text-[14px]">{t.op}</td>
                  <td className="py-2.5 px-2">{t.dur}ms</td>
                  <td className="py-2.5 px-2">{t.spans}</td>
                  <td className="py-2.5 px-2 text-right">
                    <span className={`mono text-[9px] tracking-[0.22em] px-1.5 py-0.5 ${
                      t.status === "slow" ? "bg-signal text-bone" : "brick"
                    }`}>{t.status.toUpperCase()}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
