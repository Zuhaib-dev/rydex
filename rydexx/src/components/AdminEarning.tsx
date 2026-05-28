"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAdminRealtimeRefresh } from "@/hooks/useAdminRealtime";
import { TrendingUp, TrendingDown, Zap, Calendar, BarChart2, Star, ShieldCheck } from "lucide-react";
import axios from "axios";

type Earnings = {
  date: string;
  earnings: number;
};

type TooltipPayload = {
  value: number;
  payload: Earnings;
};

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl shadow-xl p-4 min-w-[140px]">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">
          {label}
        </p>
        <p className="text-xl font-bold text-gray-900 font-mono">
          ₹{payload[0].value.toLocaleString("en-IN")}
        </p>
      </div>
    );
  }
  return null;
};

function fmt(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

export default function AdminEarningsChart() {
  const [data, setData] = useState<Earnings[]>([]);
  const [loaded, setLoaded] = useState(false);

  const fetchEarnings = useCallback(async () => {
    try {
      const res = await axios.get("/api/admin/earnings");
      const last7Days: Earnings[] = res.data.earnings.slice(-7);
      setData(last7Days);
    } catch (error) {
      console.error("Failed to load earnings:", error);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void fetchEarnings();
  }, [fetchEarnings]);

  useAdminRealtimeRefresh("earnings", fetchEarnings);

  const total = data.reduce((a, d) => a + d.earnings, 0);
  const avg = data.length ? Math.round(total / data.length) : 0;
  const max = data.length ? Math.max(...data.map((d) => d.earnings)) : 0;
  const bestDay = data.find((d) => d.earnings === max);
  const today = data[data.length - 1];
  const yesterday = data[data.length - 2];
  const delta = today && yesterday ? today.earnings - yesterday.earnings : 0;
  const deltaPositive = delta >= 0;
  const deltaPct = yesterday?.earnings ? Math.abs(Math.round((delta / yesterday.earnings) * 100)) : 0;

  const metrics = [
    {
      label: "Best Day",
      value: fmt(max),
      sub: bestDay?.date ?? "—",
      icon: <Star size={14} />,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
    {
      label: "Daily Avg",
      value: fmt(avg),
      sub: "per day",
      icon: <BarChart2 size={14} />,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Today",
      value: today ? fmt(today.earnings) : "—",
      sub: today && yesterday
        ? `${deltaPositive ? "+" : ""}${fmt(delta)} vs yesterday`
        : "—",
      icon: <Zap size={14} />,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
  ];

  return (
    <div className="bg-white rounded-[28px] border border-gray-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 w-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-widest uppercase text-blue-700 bg-blue-50 px-3 py-1 rounded-full mb-2">
            <ShieldCheck size={12} />
            Platform Earnings
          </span>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">
            Daily Earnings
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">Last 7 days performance</p>
        </div>

        <div className="text-right">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
            Weekly Total
          </p>
          <motion.p
            key={total}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold text-gray-900 font-mono tracking-tight"
          >
            {fmt(total)}
          </motion.p>
          <div
            className={`flex items-center justify-end gap-1 text-xs font-semibold mt-1 ${
              deltaPositive ? "text-emerald-600" : "text-rose-500"
            }`}
          >
            {deltaPositive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            <span>{deltaPct}% vs yesterday</span>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 12 }}
            animate={loaded ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: i * 0.07, duration: 0.4 }}
            className="bg-gray-50 rounded-2xl p-4"
          >
            <div className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider mb-2 ${m.color}`}>
              <span className={`${m.bg} p-1 rounded-lg ${m.color}`}>{m.icon}</span>
              {m.label}
            </div>
            <p className="text-lg font-bold text-gray-900 font-mono leading-none">
              {m.value}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">{m.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Chart */}
      <AnimatePresence mode="wait">
        {!loaded ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-56 rounded-2xl bg-gray-50 animate-pulse"
          />
        ) : data.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="h-56 rounded-2xl border border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center text-center px-6"
          >
            <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 mb-3">
              <BarChart2 size={20} />
            </div>
            <p className="text-sm font-bold text-gray-900">No platform earnings yet</p>
            <p className="text-xs text-gray-400 mt-1 max-w-xs">
              Admin commission appears here after completed paid bookings.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="chart"
            initial={{ opacity: 0, scaleY: 0.92 }}
            animate={{ opacity: 1, scaleY: 1 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="h-56 min-h-56 w-full min-w-0"
          >
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <BarChart data={data} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#9ca3af", fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => "₹" + (v >= 1000 ? (v / 1000).toFixed(0) + "k" : v)}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f9fafb", radius: 8 }} />
                <Bar dataKey="earnings" radius={[8, 8, 3, 3]}>
                  {data.map((entry, index) => {
                    const isToday = index === data.length - 1;
                    const isBest = entry.earnings === max && !isToday;
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          isToday
                            ? "#10b981"
                            : isBest
                            ? "#8b5cf6"
                            : "#bfdbfe"
                        }
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend + Footer */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50 flex-wrap gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          {[
            { color: "bg-emerald-500", label: "Today" },
            { color: "bg-violet-500", label: "Best day" },
            { color: "bg-blue-200", label: "Other days" },
          ].map((l) => (
            <span key={l.label} className="flex items-center gap-1.5 text-[12px] text-gray-500">
              <span className={`w-2.5 h-2.5 rounded-sm ${l.color}`} />
              {l.label}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <Calendar size={12} />
          Live sync enabled
        </div>
      </div>
    </div>
  );
}
