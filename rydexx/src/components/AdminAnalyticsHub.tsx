"use client";

import { motion } from "framer-motion";
import { PageHead, Panel } from "@/components/partner/shared";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(res => res.json());






export default function Analytics() {
  const { data, isLoading } = useSWR("/api/admin/analytics", fetcher, { refreshInterval: 60000 });

  const dailyStats = data?.dailyStats || [];
  const driverStats = data?.driverStats || [];

  const totalRev = dailyStats.reduce((sum: number, day: any) => sum + day.revenue, 0);
  const totalRides = dailyStats.reduce((sum: number, day: any) => sum + day.rideVolume, 0);
  const avgDuration = dailyStats.length > 0 ? Math.round(dailyStats.reduce((sum: number, day: any) => sum + day.avgDuration, 0) / dailyStats.length) : 0;
  
  const onlineDrivers = driverStats.find((d: any) => d.name === "Online")?.value || 0;
  const busyDrivers = driverStats.find((d: any) => d.name === "On Ride")?.value || 0;
  const activeDrivers = onlineDrivers + busyDrivers;

  const METRICS = [
    { code: "M-01", label: "Revenue · 30D", value: `₹${totalRev.toLocaleString('en-IN')}`, delta: "—" },
    { code: "M-02", label: "Active Drivers", value: activeDrivers.toString(), delta: "LIVE" },
    { code: "M-03", label: "Total Rides · 30D", value: totalRides.toString(), delta: "—" },
    { code: "M-04", label: "Avg Duration", value: `${avgDuration}m`, delta: "—" },
  ];

  // Last 14 days for the charts
  const recentDays = dailyStats.slice(-14);
  const barsRev = recentDays.map((d: any) => d.revenue);
  const barsDrv = recentDays.map((d: any) => d.rideVolume); // mapping ride volume here since we don't track historical drivers

  return (
    <div className="space-y-6">
      <PageHead code="ADM / 01" title="Advanced Analytics" subtitle="Structural readouts · model R-04 · refreshed every 60s" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
           <div className="col-span-4 py-8 text-center text-muted-foreground">Loading Analytics Engine...</div>
        ) : METRICS.map((m, i) => (
          <motion.div
            key={m.code}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="hairline bg-card p-4"
          >
            <div className="mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground">{m.code} · {m.label}</div>
            <div className="serif italic text-[34px] font-black leading-none tracking-tighter mt-3 truncate">{m.value}</div>
            <div className="mono text-[10px] tracking-[0.22em] uppercase text-signal mt-2">{m.delta}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <BarPanel code="CHT / 02" title="Revenue · 14 day blocks" data={barsRev.length ? barsRev : [0]} unit="₹" />
        <BarPanel code="CHT / 03" title="Ride Volume · 14 day blocks" data={barsDrv.length ? barsDrv : [0]} unit="rides" />
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
