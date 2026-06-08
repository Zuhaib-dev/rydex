"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend, 
  AreaChart,
  Area
} from "recharts";
import { motion, AnimatePresence } from "motion/react";
import axios from "axios";
import { Activity, Car, Clock, RefreshCw, TrendingUp } from "lucide-react";

type DailyStat = {
  date: string;
  revenue: number;
  rideVolume: number;
  avgDuration: number;
};

type DriverStat = {
  name: string;
  value: number;
  fill: string;
};

type AnalyticsData = {
  dailyStats: DailyStat[];
  driverStats: DriverStat[];
};

export default function AdminAnalyticsHub() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/admin/analytics");
      setData(res.data);
    } catch (error) {
      console.error("Failed to load analytics:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  if (!data && loading) {
    return (
      <div className="flex h-96 items-center justify-center rounded-3xl bg-white border border-gray-100 shadow-sm">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <RefreshCw size={24} className="animate-spin" />
          <p className="text-sm font-bold uppercase tracking-widest">Loading Analytics...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-gray-900">Advanced Analytics</h2>
          <p className="text-sm text-gray-500 mt-1">Operational insights over the last 30 days.</p>
        </div>
        <button
          onClick={() => void fetchAnalytics()}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold shadow-sm border border-gray-200 transition-all hover:bg-gray-50 active:scale-95 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart: Revenue & Ride Volume */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 rounded-[28px] bg-white p-6 border border-gray-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
        >
          <div className="mb-6 flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp size={18} />
            </div>
            <h3 className="text-lg font-bold">Revenue & Ride Volume</h3>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <ComposedChart data={data.dailyStats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 40px rgba(0,0,0,0.1)" }}
                  itemStyle={{ fontSize: "14px", fontWeight: "bold" }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600 }} />
                <Bar yAxisId="left" dataKey="revenue" name="Revenue (₹)" fill="#000" radius={[4, 4, 0, 0]} barSize={20} />
                <Line yAxisId="right" type="monotone" dataKey="rideVolume" name="Completed Rides" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Driver Status Pie */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-[28px] bg-white p-6 border border-gray-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex flex-col"
        >
          <div className="mb-2 flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Car size={18} />
            </div>
            <h3 className="text-lg font-bold">Driver Status</h3>
          </div>
          <div className="flex-1 min-h-[250px] relative">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <PieChart>
                <Pie
                  data={data.driverStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {data.driverStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 40px rgba(0,0,0,0.1)" }}
                  itemStyle={{ fontWeight: "bold" }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-2">
              <span className="text-3xl font-black text-gray-900 leading-none">
                {data.driverStats.reduce((acc, curr) => acc + curr.value, 0)}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">Total</span>
            </div>
          </div>
          {/* Custom Legend */}
          <div className="grid grid-cols-3 gap-2 mt-2">
            {data.driverStats.map((stat) => (
              <div key={stat.name} className="flex flex-col items-center justify-center bg-gray-50 rounded-xl p-2">
                <span className="w-2 h-2 rounded-full mb-1" style={{ backgroundColor: stat.fill }} />
                <span className="text-xs font-bold text-gray-900">{stat.value}</span>
                <span className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold">{stat.name}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Avg Duration Area Chart */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-3 rounded-[28px] bg-black p-6 shadow-[0_8px_30px_rgba(0,0,0,0.2)] text-white"
        >
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <Clock size={18} />
              </div>
              <div>
                <h3 className="text-lg font-bold">Operational Efficiency</h3>
                <p className="text-xs text-white/50 uppercase tracking-widest mt-0.5">Average Ride Duration (Mins)</p>
              </div>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <AreaChart data={data.dailyStats}>
                <defs>
                  <linearGradient id="colorDuration" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9eff6b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#9eff6b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "rgba(255,255,255,0.5)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "rgba(255,255,255,0.5)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1f2937", borderRadius: "12px", border: "none", color: "#fff" }}
                  itemStyle={{ color: "#9eff6b", fontWeight: "bold" }}
                />
                <Area type="monotone" dataKey="avgDuration" name="Avg Duration (mins)" stroke="#9eff6b" strokeWidth={3} fillOpacity={1} fill="url(#colorDuration)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
