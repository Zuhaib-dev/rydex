"use client";

import { PageHead, Panel } from "@/components/partner/shared";
import { ShieldAlert } from "lucide-react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(res => res.json());



export default function AuditLogs() {
  const { data, isLoading } = useSWR("/api/admin/audit-logs?limit=50", fetcher);
  const logs = data?.logs || [];
  const total = data?.pagination?.total || 0;

  return (
    <div className="space-y-6">
      <PageHead code="ADM / 08" title="Security Logs" subtitle={`Audit trail · immutable · ${isLoading ? "..." : total} logs stored`} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { l: "Events · 24H", v: isLoading ? "..." : logs.length },
          { l: "Blocked Attacks", v: "0" },
          { l: "Active Sessions", v: "1" },
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
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Loading audit trail...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No audit logs found.</td></tr>
              ) : logs.map((l: any) => {
                const date = new Date(l.createdAt);
                const ts = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
                const code = "SEC-" + l._id.substring(l._id.length - 4).toUpperCase();
                const sev = l.severity === "critical" || l.severity === "error" ? "high" : l.severity === "warning" ? "med" : "low";
                
                return (
                <tr key={l._id} className="hover:bg-ink hover:text-bone transition-colors group">
                  <td className="py-2.5 px-2 text-muted-foreground group-hover:text-bone/60">{ts}</td>
                  <td className="py-2.5 px-2 text-signal">{code}</td>
                  <td className="py-2.5 px-2">{l.actor || "system"}</td>
                  <td className="py-2.5 px-2 serif text-[14px] flex items-center gap-2">
                    {sev === "high" && <ShieldAlert className="h-3 w-3 text-signal" />}
                    {l.action}
                  </td>
                  <td className="py-2.5 px-2">{l.correlationId?.substring(0, 8) || "—"}</td>
                  <td className="py-2.5 px-2 text-right">
                    <span className={`mono text-[9px] tracking-[0.22em] px-1.5 py-0.5 ${
                      sev === "high" ? "bg-signal text-bone" : sev === "med" ? "brick" : "hairline group-hover:border-bone"
                    }`}>{sev.toUpperCase()}</span>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
