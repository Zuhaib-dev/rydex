"use client";

import { motion } from "framer-motion";
import { PageHead, Panel } from "@/components/partner/shared";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(res => res.json());

function formatUptime(seconds: number) {
  if (!seconds) return "0s";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function SystemHealth() {
  const { data, isLoading } = useSWR("/api/admin/health-metrics", fetcher, { refreshInterval: 5000 });

  const dbStatus = data?.dbStatus || "Disconnected";
  const socketStatus = data?.socketServerStatus || "Offline";
  const socketClients = data?.socketClientsCount || 0;
  const uptime = data?.uptime || 0;
  
  const memory = data?.memory || { rss: 0, heapUsed: 0, heapTotal: 0, external: 0 };
  const heapPercent = memory.heapTotal > 0 ? Math.round((memory.heapUsed / memory.heapTotal) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <PageHead 
          code="ADM / 09" 
          title="System Telemetry & Health" 
          subtitle="Live monitoring of servers and infrastructure integrations" 
        />
        <div className="flex items-center gap-2 px-3 py-1.5 border border-border bg-card mt-2">
          <div className="w-2 h-2 rounded-full bg-signal animate-pulse" />
          <span className="mono text-[10px] tracking-widest uppercase text-signal">Auto-refresh (5s)</span>
        </div>
      </div>

      {/* Grid for top metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Database */}
        <div className="hairline bg-card p-4 flex flex-col justify-between h-[120px]">
          <div className="mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground">Database</div>
          <div className={`serif italic text-[34px] font-black leading-none tracking-tighter ${dbStatus === "Connected" ? "text-foreground" : "text-signal"}`}>
            {isLoading ? "..." : dbStatus}
          </div>
          <div className="mono text-[9px] tracking-[0.15em] uppercase text-muted-foreground">
            MongoDB Atlas Cluster
          </div>
        </div>

        {/* Socket Engine */}
        <div className="hairline bg-card p-4 flex flex-col justify-between h-[120px]">
          <div className="mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground">Socket Engine</div>
          <div className={`serif italic text-[34px] font-black leading-none tracking-tighter ${socketStatus === "Online" ? "text-foreground" : "text-signal"}`}>
            {isLoading ? "..." : socketStatus}
          </div>
          <div className="mono text-[9px] tracking-[0.15em] uppercase text-muted-foreground">
            WS Gateway :8000
          </div>
        </div>

        {/* WebSockets */}
        <div className="hairline bg-card p-4 flex flex-col justify-between h-[120px]">
          <div className="mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground">WebSockets</div>
          <div className="serif italic text-[34px] font-black leading-none tracking-tighter">
            <span className="text-[14px] text-muted-foreground not-italic mr-2">Active Channels</span>
            {isLoading ? "..." : socketClients}
          </div>
          <div className="mono text-[9px] tracking-[0.15em] uppercase text-muted-foreground">
            Connected clients & drivers
          </div>
        </div>

        {/* App Process Uptime */}
        <div className="hairline bg-card p-4 flex flex-col justify-between h-[120px]">
          <div className="mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground">App Process Uptime</div>
          <div className="serif italic text-[34px] font-black leading-none tracking-tighter">
            {isLoading ? "..." : formatUptime(uptime)}
          </div>
          <div className="mono text-[9px] tracking-[0.15em] uppercase text-muted-foreground">
            Next.js Server Process
          </div>
        </div>
      </div>

      {/* Panels for detailed specs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel code="MEM / 09" title="V8 Virtual Machine Memory">
          <div className="p-4 space-y-4">
            <div className="flex justify-between items-end border-b border-border pb-3">
              <div className="mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Heap Used vs Total</div>
              <div className="serif italic text-[24px] font-black">{memory.heapUsed}MB / {memory.heapTotal}MB <span className="text-[14px] text-muted-foreground ml-1">({heapPercent}%)</span></div>
            </div>
            <div className="flex justify-between items-end border-b border-border pb-3">
              <div className="mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">RSS Size</div>
              <div className="serif italic text-[24px] font-black">{memory.rss}MB</div>
            </div>
            <div className="flex justify-between items-end border-b border-border pb-3">
              <div className="mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Heap Committed</div>
              <div className="serif italic text-[24px] font-black">{memory.heapTotal}MB</div>
            </div>
            <div className="flex justify-between items-end">
              <div className="mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">External Allocations</div>
              <div className="serif italic text-[24px] font-black">{memory.external}MB</div>
            </div>
          </div>
        </Panel>

        <Panel code="ENV / 09" title="Environment Specs">
          <div className="p-4 space-y-4">
            <div className="flex justify-between items-end border-b border-border pb-3">
              <div className="mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Node Version</div>
              <div className="serif italic text-[24px] font-black">{data?.nodeVersion || "..."}</div>
            </div>
            <div className="flex justify-between items-end border-b border-border pb-3">
              <div className="mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Host OS Platform</div>
              <div className="serif italic text-[24px] font-black">{data?.platform || "..."}</div>
            </div>
            <div className="flex justify-between items-end border-b border-border pb-3">
              <div className="mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Mongoose Version</div>
              <div className="serif italic text-[24px] font-black">{data?.mongooseVersion ? `v${data.mongooseVersion}` : "v9.3.2"}</div>
            </div>
            <div className="flex justify-between items-end">
              <div className="mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Next.js Framework</div>
              <div className="serif italic text-[24px] font-black">16.2.1 <span className="text-[14px] text-muted-foreground ml-1">(Turbopack)</span></div>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
