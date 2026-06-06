"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { getSocket } from "@/lib/socket";
import axios from "axios";
import {
  Server,
  Database,
  Activity,
  Cpu,
  HardDrive,
  Clock,
  ShieldAlert,
  Play,
  Pause,
  Trash2,
  Download,
  Search,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Terminal,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface TelemetryPayload {
  ws: {
    connectedClients: number;
    connectionRate: number;
    peakConnections: number;
    status: string;
  };
  redis: {
    memoryUsedBytes: number;
    memoryUsedHuman: string;
    connectedClients: number;
    keysCount: number;
    evictedKeys: number;
    hitRate: number;
  };
  api: {
    avgResponseTimeMs: number;
    p95LatencyMs: number;
    p99LatencyMs: number;
    rps: number;
    successRate: number;
    errorRate: number;
  };
  server: {
    cpuLoad: number;
    memoryUsagePercentage: number;
    memoryTotalGb: number;
    memoryFreeGb: number;
    processHeapUsedMb: number;
    processHeapTotalMb: number;
    jobQueueSize: number;
  };
  timestamp: number;
}

interface AuditLog {
  _id: string;
  adminId?: string;
  adminName?: string;
  adminEmail?: string;
  action: string;
  targetId?: string;
  targetModel?: string;
  targetName?: string;
  details?: string;
  severity: "info" | "warning" | "error" | "critical";
  category: "auth" | "admin" | "config" | "api" | "security" | "task" | "db";
  actor: string;
  correlationId?: string;
  createdAt: string;
}

function AreaSparkline({
  data,
  width = 240,
  height = 60,
  color = "#10b981",
  gradientId,
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  gradientId: string;
}) {
  const points = useMemo(() => {
    if (data.length < 2) return [];
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min === 0 ? 1 : max - min;

    return data.map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 12) - 6; // Padding
      return { x, y };
    });
  }, [data, width, height]);

  if (data.length < 2) {
    return (
      <div className="flex h-[60px] items-center justify-center text-[10px] text-zinc-400 font-bold uppercase tracking-wider animate-pulse">
        Collecting Data...
      </div>
    );
  }

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ObservabilityDashboard() {
  const [telemetry, setTelemetry] = useState<TelemetryPayload | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  
  // History lists for sparklines (max 20 points)
  const [cpuHistory, setCpuHistory] = useState<number[]>([]);
  const [ramHistory, setRamHistory] = useState<number[]>([]);
  const [connHistory, setConnHistory] = useState<number[]>([]);
  const [latencyHistory, setLatencyHistory] = useState<number[]>([]);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const logEndRef = useRef<HTMLDivElement>(null);
  const pendingLogsRef = useRef<AuditLog[]>([]);

  // Initial fetch of logs to populate
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const { data } = await axios.get("/api/admin/audit-logs?page=1&limit=100");
        setLogs(data.logs || []);
      } catch (err) {
        console.error("Failed to load initial audit logs:", err);
      }
    };
    fetchLogs();
  }, []);

  // Socket listener setup
  useEffect(() => {
    const socket = getSocket();

    const handleTelemetry = (payload: TelemetryPayload) => {
      setTelemetry(payload);
      
      // Update historical points
      setCpuHistory(prev => [...prev, Math.round(payload.server.cpuLoad * 100)].slice(-20));
      setRamHistory(prev => [...prev, payload.server.memoryUsagePercentage].slice(-20));
      setConnHistory(prev => [...prev, payload.ws.connectedClients].slice(-20));
      setLatencyHistory(prev => [...prev, payload.api.avgResponseTimeMs].slice(-20));
    };

    const handleNewLog = (newLog: AuditLog) => {
      if (isPaused) {
        pendingLogsRef.current.push(newLog);
      } else {
        setLogs(prev => [newLog, ...prev].slice(0, 1000)); // DOM performance limit
      }
    };

    socket.on("system-telemetry-update", handleTelemetry);
    socket.on("live-audit-log", handleNewLog);

    return () => {
      socket.off("system-telemetry-update", handleTelemetry);
      socket.off("live-audit-log", handleNewLog);
    };
  }, [isPaused]);

  // Handle Pause/Resume queue release
  const togglePause = () => {
    if (isPaused) {
      // Release pending logs
      if (pendingLogsRef.current.length > 0) {
        setLogs(prev => [...pendingLogsRef.current.reverse(), ...prev].slice(0, 1000));
        pendingLogsRef.current = [];
      }
    }
    setIsPaused(!isPaused);
  };

  // Scroll to bottom helper for live scrolling feed
  useEffect(() => {
    if (autoScroll && !isPaused && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll, isPaused]);

  // Filters logic
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchSearch =
        searchTerm === "" ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase())) ||
        log.actor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.correlationId && log.correlationId.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchSeverity = severityFilter === "all" || log.severity === severityFilter;
      const matchCategory = categoryFilter === "all" || log.category === categoryFilter;

      return matchSearch && matchSeverity && matchCategory;
    });
  }, [logs, searchTerm, severityFilter, categoryFilter]);

  // Exports logic
  const exportLogs = (format: "json" | "csv") => {
    if (filteredLogs.length === 0) return;
    
    let dataStr = "";
    let filename = `audit-logs-${Date.now()}`;

    if (format === "json") {
      dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
      filename += ".json";
    } else {
      // CSV Export
      const headers = ["Timestamp", "Severity", "Category", "Actor", "Action", "Details", "Trace ID"];
      const rows = filteredLogs.map(log => [
        new Date(log.createdAt).toISOString(),
        log.severity.toUpperCase(),
        log.category.toUpperCase(),
        log.actor,
        log.action,
        log.details || "",
        log.correlationId || ""
      ]);
      const csvContent = [headers.join(","), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");
      dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
      filename += ".csv";
    }

    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case "critical":
        return { text: "text-red-700 bg-red-50 border-red-200", icon: AlertCircle };
      case "error":
        return { text: "text-rose-700 bg-rose-50 border-rose-100", icon: ShieldAlert };
      case "warning":
        return { text: "text-amber-700 bg-amber-50 border-amber-100", icon: AlertTriangle };
      case "info":
      default:
        return { text: "text-zinc-700 bg-zinc-50 border-zinc-100", icon: CheckCircle };
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="text-zinc-800" size={20} />
            System Observability Hub
          </h2>
          <p className="text-sm text-gray-400">Live infrastructure performance, microservices health, and system audit logs stream</p>
        </div>
        
        {/* Status Connection Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-white rounded-full text-xs font-semibold w-fit">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Real-time Stream Connected</span>
        </div>
      </div>

      {/* Observability Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* 1. WebSocket Connections */}
        <div className="bg-white border border-gray-100 p-5 rounded-3xl shadow-sm flex flex-col justify-between h-[180px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase">WebSocket Concurrency</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Activity size={16} />
            </div>
          </div>
          <div className="my-2">
            <h3 className="text-3xl font-black text-zinc-950 tabular-nums">
              {telemetry ? telemetry.ws.connectedClients : "--"}
            </h3>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-zinc-500 font-semibold">
              <span>Peak: <strong className="text-zinc-800 font-black">{telemetry ? telemetry.ws.peakConnections : "0"}</strong></span>
              <span>•</span>
              <span>Rate: <strong className="text-zinc-800 font-black">{telemetry ? telemetry.ws.connectionRate : "0"}/m</strong></span>
            </div>
          </div>
          <div className="w-full">
            <AreaSparkline data={connHistory} color="#8b5cf6" gradientId="wsG" />
          </div>
        </div>

        {/* 2. Redis Metrics */}
        <div className="bg-white border border-gray-100 p-5 rounded-3xl shadow-sm flex flex-col justify-between h-[180px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase">Redis Performance</span>
            <div className="p-2 bg-red-50 text-red-600 rounded-xl">
              <Database size={16} />
            </div>
          </div>
          <div className="my-2">
            <h3 className="text-3xl font-black text-zinc-950 tabular-nums">
              {telemetry ? telemetry.redis.keysCount : "--"} <span className="text-xs font-semibold text-zinc-400">keys</span>
            </h3>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-zinc-500 font-semibold">
              <span>RAM: <strong className="text-zinc-800 font-black">{telemetry ? telemetry.redis.memoryUsedHuman : "0B"}</strong></span>
              <span>•</span>
              <span>HitRate: <strong className="text-zinc-800 font-black">{telemetry ? telemetry.redis.hitRate : "0"}%</strong></span>
            </div>
          </div>
          <div className="w-full">
            {/* Draw a static line or sparkline based on CPU load */}
            <AreaSparkline data={ramHistory} color="#ef4444" gradientId="redisG" />
          </div>
        </div>

        {/* 3. API Metrics */}
        <div className="bg-white border border-gray-100 p-5 rounded-3xl shadow-sm flex flex-col justify-between h-[180px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase">API Performance</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Server size={16} />
            </div>
          </div>
          <div className="my-2">
            <h3 className="text-3xl font-black text-zinc-950 tabular-nums">
              {telemetry ? `${telemetry.api.avgResponseTimeMs}ms` : "--"}
            </h3>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-zinc-500 font-semibold">
              <span>P95: <strong className="text-zinc-800 font-black">{telemetry ? `${telemetry.api.p95LatencyMs}ms` : "0"}</strong></span>
              <span>•</span>
              <span>RPS: <strong className="text-zinc-800 font-black">{telemetry ? telemetry.api.rps : "0"}</strong></span>
            </div>
          </div>
          <div className="w-full">
            <AreaSparkline data={latencyHistory} color="#10b981" gradientId="apiG" />
          </div>
        </div>

        {/* 4. Host OS Server CPU Load */}
        <div className="bg-white border border-gray-100 p-5 rounded-3xl shadow-sm flex flex-col justify-between h-[180px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase">Host Machine Resources</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Cpu size={16} />
            </div>
          </div>
          <div className="my-2">
            <h3 className="text-3xl font-black text-zinc-950 tabular-nums">
              {telemetry ? `${Math.round(telemetry.server.cpuLoad * 100)}%` : "--"}
            </h3>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-zinc-500 font-semibold">
              <span>RAM: <strong className="text-zinc-800 font-black">{telemetry ? `${telemetry.server.memoryUsagePercentage}%` : "0"}</strong></span>
              <span>•</span>
              <span>Queue: <strong className="text-zinc-800 font-black">{telemetry ? telemetry.server.jobQueueSize : "0"}</strong></span>
            </div>
          </div>
          <div className="w-full">
            <AreaSparkline data={cpuHistory} color="#f59e0b" gradientId="cpuG" />
          </div>
        </div>

      </div>

      {/* Audit Log Stream Component */}
      <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden flex flex-col">
        {/* Controls Toolbar */}
        <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="font-black text-zinc-950 uppercase text-xs tracking-wider flex items-center gap-2">
              <Terminal size={14} className="text-zinc-500" />
              Live Audit Log Feed
            </h3>
            <p className="text-[11px] text-zinc-400 font-semibold mt-0.5">Filtered logs: {filteredLogs.length} / Max 1000 items in buffer</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Box */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-zinc-400" size={14} />
              <input
                type="text"
                placeholder="Search action, details, trace ID..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs w-[220px] focus:outline-none focus:border-zinc-950"
              />
            </div>

            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={e => setSeverityFilter(e.target.value)}
              className="px-3 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-zinc-950"
            >
              <option value="all">All Severities</option>
              <option value="info">INFO</option>
              <option value="warning">WARNING</option>
              <option value="error">ERROR</option>
              <option value="critical">CRITICAL</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-zinc-950"
            >
              <option value="all">All Categories</option>
              <option value="auth">AUTH</option>
              <option value="admin">ADMIN</option>
              <option value="config">CONFIG</option>
              <option value="api">API</option>
              <option value="security">SECURITY</option>
              <option value="task">TASK</option>
              <option value="db">DB</option>
            </select>

            {/* Interactive Stream controls */}
            <div className="flex items-center gap-1.5 border-l border-zinc-200 pl-3">
              <button
                onClick={togglePause}
                className={`p-2 rounded-xl border flex items-center justify-center transition-colors ${
                  isPaused
                    ? "bg-amber-100 border-amber-200 text-amber-700 hover:bg-amber-150"
                    : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                }`}
                title={isPaused ? "Resume Stream" : "Pause Stream"}
              >
                {isPaused ? <Play size={14} className="fill-current" /> : <Pause size={14} />}
              </button>
              
              <button
                onClick={() => setLogs([])}
                className="p-2 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 text-zinc-600 flex items-center justify-center transition-colors"
                title="Clear View"
              >
                <Trash2 size={14} />
              </button>

              <button
                onClick={() => exportLogs("json")}
                disabled={filteredLogs.length === 0}
                className="p-2 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 text-zinc-600 flex items-center justify-center transition-colors disabled:opacity-50"
                title="Export JSON"
              >
                <Download size={14} />
              </button>

              <label className="flex items-center gap-1.5 text-[10px] font-black uppercase text-zinc-500 tracking-wider cursor-pointer ml-1 select-none">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={e => setAutoScroll(e.target.checked)}
                  className="rounded border-zinc-300 accent-black focus:ring-black"
                />
                Autoscroll
              </label>
            </div>

          </div>
        </div>

        {/* Live log feed box */}
        <div className="h-[400px] overflow-y-auto bg-zinc-950 font-mono text-[11px] p-5 text-zinc-200 leading-normal space-y-2">
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-2 select-none">
              <Terminal size={20} />
              <span>No logs found matching selected criteria</span>
            </div>
          ) : (
            <div className="space-y-2.5">
              {[...filteredLogs].reverse().map((log, index) => {
                const sevStyle = getSeverityStyle(log.severity);
                const Icon = sevStyle.icon;
                return (
                  <div key={log._id || index} className="flex items-start gap-3 border-b border-zinc-900/60 pb-2">
                    <span className="text-zinc-600 select-none font-semibold shrink-0">
                      {new Date(log.createdAt).toLocaleTimeString([], { hour12: false })}
                    </span>
                    <span className={`inline-flex items-center gap-1 border rounded px-2 py-0.5 text-[9px] font-black uppercase tracking-widest shrink-0 ${sevStyle.text}`}>
                      <Icon size={8} />
                      {log.severity}
                    </span>
                    <span className="text-purple-400 font-bold shrink-0">
                      [{log.category.toUpperCase()}]
                    </span>
                    <span className="text-zinc-500 select-none shrink-0">
                      via {log.actor} •
                    </span>
                    <div className="flex-1 min-w-0">
                      <strong className="text-white font-bold">{log.action}: </strong>
                      <span className="text-zinc-300 whitespace-pre-wrap font-medium">{log.details}</span>
                      {log.correlationId && (
                        <span className="text-zinc-600 block mt-0.5 text-[9px]">Trace ID: {log.correlationId}</span>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={logEndRef} />
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
