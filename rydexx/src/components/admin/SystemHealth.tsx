"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import { Server, Database, Activity, RefreshCw, Cpu, HardDrive, Clock } from "lucide-react";
import { motion } from "motion/react";

interface HealthData {
  dbStatus: string;
  socketServerStatus: string;
  socketClientsCount: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  uptime: number;
  nodeVersion: string;
  platform: string;
}

export default function SystemHealth() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMetrics = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await axios.get("/api/admin/health-metrics");
      setData(res.data);
    } catch (error) {
      console.error("Failed to load health metrics:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    if (autoRefresh) {
      timerRef.current = setInterval(() => {
        void fetchMetrics();
      }, 5000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoRefresh, fetchMetrics]);

  const formatUptime = (sec: number) => {
    const d = Math.floor(sec / (3600 * 24));
    const h = Math.floor((sec % (3600 * 24)) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${d > 0 ? `${d}d ` : ""}${h > 0 ? `${h}h ` : ""}${m > 0 ? `${m}m ` : ""}${s}s`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <RefreshCw size={24} className="animate-spin text-gray-400" />
        <p className="text-sm font-semibold text-gray-500">Loading system metrics...</p>
      </div>
    );
  }

  const memoryPercentage = data ? Math.round((data.memory.heapUsed / data.memory.heapTotal) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">System Telemetry & Health</h2>
          <p className="text-sm text-gray-400">Live monitoring of servers and infrastructure integrations</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 accent-black focus:ring-black"
            />
            Auto-refresh (5s)
          </label>
          <button
            onClick={() => void fetchMetrics()}
            disabled={refreshing}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition hover:border-gray-300 hover:text-gray-900 disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {data && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* DB Indicator */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100/50 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-green-50 border border-green-100 text-green-600 flex items-center justify-center">
                <Database size={18} />
              </div>
              <span className={`h-2.5 w-2.5 rounded-full ${data.dbStatus === "Connected" ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Database</p>
              <h3 className="text-2xl font-black text-gray-900 mt-1">{data.dbStatus}</h3>
              <p className="text-xs text-gray-400 mt-1">MongoDB Atlas Cluster</p>
            </div>
          </div>

          {/* Socket Indicator */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100/50 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
                <Server size={18} />
              </div>
              <span className={`h-2.5 w-2.5 rounded-full ${data.socketServerStatus === "Online" ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Socket Engine</p>
              <h3 className="text-2xl font-black text-gray-900 mt-1">{data.socketServerStatus}</h3>
              <p className="text-xs text-gray-400 mt-1">WS Gateway :8000</p>
            </div>
          </div>

          {/* Active Clients */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100/50 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center">
                <Activity size={18} />
              </div>
              <span className="text-[10px] font-black uppercase text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">WebSockets</span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active Channels</p>
              <h3 className="text-3xl font-black text-gray-900 mt-1 tabular-nums">{data.socketClientsCount}</h3>
              <p className="text-xs text-gray-400 mt-1">Connected clients & drivers</p>
            </div>
          </div>

          {/* Server Uptime */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100/50 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
                <Clock size={18} />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">App Process Uptime</p>
              <h3 className="text-xl font-black text-gray-900 mt-1 leading-normal truncate" title={formatUptime(data.uptime)}>
                {formatUptime(data.uptime)}
              </h3>
              <p className="text-xs text-gray-400 mt-1">Next.js Server Process</p>
            </div>
          </div>
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Memory Usage Card */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100/50 shadow-sm lg:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <HardDrive size={18} className="text-gray-400" />
              <h3 className="font-bold text-gray-900">V8 Virtual Machine Memory</h3>
            </div>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase mb-2">
                  <span>Heap Used vs Total</span>
                  <span className="font-mono">{data.memory.heapUsed}MB / {data.memory.heapTotal}MB ({memoryPercentage}%)</span>
                </div>
                <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-black rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${memoryPercentage}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-2">
                <div className="bg-gray-50 rounded-2xl p-4">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">RSS Size</span>
                  <span className="text-lg font-black text-gray-900 font-mono mt-1 block">{data.memory.rss}MB</span>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Heap Committed</span>
                  <span className="text-lg font-black text-gray-900 font-mono mt-1 block">{data.memory.heapTotal}MB</span>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">External Allocations</span>
                  <span className="text-lg font-black text-gray-900 font-mono mt-1 block">{data.memory.external}MB</span>
                </div>
              </div>
            </div>
          </div>

          {/* Node Environment Details */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100/50 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <Cpu size={18} className="text-gray-400" />
              <h3 className="font-bold text-gray-900">Environment Specs</h3>
            </div>
            <div className="divide-y divide-gray-50 text-sm">
              <div className="flex justify-between py-3">
                <span className="text-gray-400 font-semibold">Node Version</span>
                <span className="text-gray-900 font-mono font-bold">{data.nodeVersion}</span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-gray-400 font-semibold">Host OS Platform</span>
                <span className="text-gray-900 font-bold capitalize">{data.platform}</span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-gray-400 font-semibold">Mongoose Version</span>
                <span className="text-gray-900 font-mono font-bold">v9.3.2</span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-gray-400 font-semibold">Next.js Framework</span>
                <span className="text-gray-900 font-bold">16.2.1 (Turbopack)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
