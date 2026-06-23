"use client";

import { PageHead, Panel } from "@/components/partner/shared";
import { ShieldAlert } from "lucide-react";

const LOGS = [
  { ts: "02:14:31", code: "SEC-9981", actor: "USR-4424", event: "Multiple failed logins", ip: "103.21.44.10", sev: "high" },
  { ts: "02:11:02", code: "SEC-9980", actor: "ADM-0001", event: "Promo BURST24 created", ip: "10.0.0.4", sev: "low" },
  { ts: "02:08:48", code: "SEC-9979", actor: "USR-4421", event: "Password rotated", ip: "192.168.1.21", sev: "low" },
  { ts: "01:58:11", code: "SEC-9978", actor: "—", event: "WAF blocked SQLi attempt", ip: "45.83.12.99", sev: "high" },
  { ts: "01:42:09", code: "SEC-9977", actor: "ADM-0002", event: "Role granted: support", ip: "10.0.0.7", sev: "med" },
];

export default function AuditLogs() {
  return (
    <div className="space-y-6">
      <PageHead code="ADM / 08" title="Security Logs" subtitle="Audit trail · immutable · WORM stored 365d" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { l: "Events · 24H", v: "1,481" },
          { l: "Blocked Attacks", v: "38" },
          { l: "Active Sessions", v: "2,114" },
        ].map((k) => (
          <div key={k.l} className="hairline bg-card p-4">
            <div className="mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground">{k.l}</div>
            <div className="serif italic text-[36px] font-black leading-none mt-3 tracking-tighter">{k.v}</div>
          </div>
        ))}
      </div>

      <Panel code="LOG / 08" title="Audit Stream">
        <div className="overflow-x-auto">
          <table className="w-full mono text-[11px]">
            <thead>
              <tr className="hairline-b text-left text-muted-foreground tracking-[0.18em] uppercase text-[9px]">
                <th className="py-2 px-2">TS</th><th className="py-2 px-2">Code</th><th className="py-2 px-2">Actor</th><th className="py-2 px-2">Event</th><th className="py-2 px-2">IP</th><th className="py-2 px-2 text-right">Sev</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {LOGS.map((l) => (
                <tr key={l.code} className="hover:bg-ink hover:text-bone transition-colors group">
                  <td className="py-2.5 px-2 text-muted-foreground group-hover:text-bone/60">{l.ts}</td>
                  <td className="py-2.5 px-2 text-signal">{l.code}</td>
                  <td className="py-2.5 px-2">{l.actor}</td>
                  <td className="py-2.5 px-2 serif text-[14px] flex items-center gap-2">
                    {l.sev === "high" && <ShieldAlert className="h-3 w-3 text-signal" />}
                    {l.event}
                  </td>
                  <td className="py-2.5 px-2">{l.ip}</td>
                  <td className="py-2.5 px-2 text-right">
                    <span className={`mono text-[9px] tracking-[0.22em] px-1.5 py-0.5 ${
                      l.sev === "high" ? "bg-signal text-bone" : l.sev === "med" ? "brick" : "hairline group-hover:border-bone"
                    }`}>{l.sev.toUpperCase()}</span>
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
