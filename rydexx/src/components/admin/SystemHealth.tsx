"use client";

import { motion } from "framer-motion";
import { PageHead, Panel } from "@/components/partner/shared";
import { CircleDot } from "lucide-react";

const SERVICES = [
  { name: "API Gateway", region: "ap-south-1", lat: "42ms", uptime: "99.998%", status: "ok" },
  { name: "Dispatch Engine", region: "ap-south-1", lat: "11ms", uptime: "99.999%", status: "ok" },
  { name: "Payments · Stripe", region: "global", lat: "78ms", uptime: "99.94%", status: "ok" },
  { name: "Realtime Sockets", region: "ap-south-1", lat: "8ms", uptime: "99.998%", status: "ok" },
  { name: "Search Index", region: "ap-south-1", lat: "31ms", uptime: "99.92%", status: "warn" },
  { name: "ML · Surge Model", region: "ap-south-1", lat: "121ms", uptime: "99.81%", status: "ok" },
];

const LOG = [
  "[02:14:31] svc=dispatch lvl=info  msg=ride.assigned req=REQ-9215 driver=DRV-0421 lat=11ms",
  "[02:14:30] svc=api      lvl=info  msg=POST /v1/rides 201 dur=42ms",
  "[02:14:29] svc=payments lvl=warn  msg=stripe.webhook retry attempt=2",
  "[02:14:28] svc=ws       lvl=info  msg=client connected uid=USR-4422",
  "[02:14:27] svc=search   lvl=warn  msg=index lag 240ms region=ap-south-1",
  "[02:14:26] svc=ml       lvl=info  msg=surge.predict region=SXR conf=0.91",
  "[02:14:25] svc=dispatch lvl=info  msg=heartbeat ok drivers=412",
  "[02:14:24] svc=api      lvl=info  msg=GET /v1/me 200 dur=8ms",
];

export default function SystemHealth() {
  return (
    <div className="space-y-6">
      <PageHead code="ADM / 09" title="System Health" subtitle="6 services · 1 warning · zero incidents 30D" />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="hairline bg-card p-6 flex items-center justify-between"
      >
        <div>
          <div className="mono text-[10px] tracking-[0.22em] uppercase text-signal mb-2">STATUS · GREEN</div>
          <h2 className="serif italic text-[44px] font-black leading-none tracking-tighter">All Systems Operational.</h2>
        </div>
        <CircleDot className="h-10 w-10 text-signal animate-blink" />
      </motion.div>

      <Panel code="SVC / 09" title="Service Matrix">
        <div className="overflow-x-auto">
          <table className="w-full mono text-[11px]">
            <thead>
              <tr className="hairline-b text-left text-muted-foreground tracking-[0.18em] uppercase text-[9px]">
                <th className="py-2 px-2">Service</th><th className="py-2 px-2">Region</th><th className="py-2 px-2">Latency</th><th className="py-2 px-2">Uptime</th><th className="py-2 px-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {SERVICES.map((s) => (
                <tr key={s.name} className="hover:bg-ink hover:text-bone transition-colors group">
                  <td className="py-2.5 px-2 serif text-[14px]">{s.name}</td>
                  <td className="py-2.5 px-2">{s.region}</td>
                  <td className="py-2.5 px-2">{s.lat}</td>
                  <td className="py-2.5 px-2">{s.uptime}</td>
                  <td className="py-2.5 px-2 text-right">
                    <span className={`mono text-[9px] tracking-[0.22em] px-1.5 py-0.5 ${
                      s.status === "warn" ? "bg-signal text-bone" : "brick"
                    }`}>{s.status.toUpperCase()}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="hairline bg-ink text-bone">
        <div className="brick border-b border-bone/20 px-4 py-2 mono text-[10px] tracking-[0.22em] uppercase flex items-center justify-between">
          <span>TTY / 09 · stdout · tail -f</span>
          <span className="text-signal animate-blink">●</span>
        </div>
        <div className="p-4 font-mono text-[11px] leading-relaxed space-y-0.5 max-h-72 overflow-y-auto">
          {LOG.map((l, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              className={l.includes("warn") ? "text-signal" : "text-bone/80"}
            >
              {l}
            </motion.div>
          ))}
          <div className="text-signal animate-blink">_</div>
        </div>
      </div>
    </div>
  );
}
