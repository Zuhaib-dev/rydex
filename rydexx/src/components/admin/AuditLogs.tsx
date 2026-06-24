"use client";

import { useState } from "react";
import { PageHead, Panel } from "@/components/partner/shared";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function AuditLogs() {
  const [page, setPage] = useState(1);
  const limit = 15;

  const { data, isLoading } = useSWR(`/api/admin/audit-logs?page=${page}&limit=${limit}`, fetcher);
  const logs = data?.logs || [];
  const total = data?.pagination?.total || 0;
  const totalPages = data?.pagination?.totalPages || 1;

  return (
    <div className="space-y-6">
      <PageHead 
        code="ADM / 08" 
        title="Security Audit Logs" 
        subtitle="Chronological history of all admin interventions" 
      />

      <Panel code="LOG / 08" title="Audit Stream">
        <div className="overflow-x-auto">
          <table className="w-full mono text-[11px] text-left">
            <thead>
              <tr className="hairline-b text-muted-foreground tracking-[0.18em] uppercase text-[9px]">
                <th className="py-3 px-4 font-normal">Timestamp</th>
                <th className="py-3 px-4 font-normal">Administrator</th>
                <th className="py-3 px-4 font-normal">Action</th>
                <th className="py-3 px-4 font-normal">Target</th>
                <th className="py-3 px-4 font-normal">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={5} className="text-center py-8 text-muted-foreground uppercase tracking-widest text-[10px]">Loading logs...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-muted-foreground uppercase tracking-widest text-[10px]">No logs found</td></tr>
              ) : logs.map((l: any) => {
                const date = new Date(l.createdAt).toLocaleString("en-GB", {
                  day: "numeric",
                  month: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: true
                });
                
                return (
                  <tr key={l._id} className="hover:bg-secondary/20 transition-colors">
                    <td className="py-3 px-4 text-muted-foreground">{date}</td>
                    <td className="py-3 px-4">{l.metadata?.adminEmail || l.actor || "—"}</td>
                    <td className="py-3 px-4 text-signal uppercase tracking-wider text-[10px]">{l.action}</td>
                    <td className="py-3 px-4 text-muted-foreground">—</td>
                    <td className="py-3 px-4">{l.details}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="px-4 py-3 border-t border-border flex items-center justify-between bg-secondary/10">
          <div className="mono text-[10px] tracking-[0.15em] text-muted-foreground uppercase">
            Showing Page {page} of {totalPages} ({total} total logs)
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="brick px-3 py-1.5 mono text-[10px] uppercase hover:bg-signal transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
            >
              Prev
            </button>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || totalPages === 0}
              className="brick px-3 py-1.5 mono text-[10px] uppercase hover:bg-signal transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
            >
              Next
            </button>
          </div>
        </div>
      </Panel>
    </div>
  );
}
