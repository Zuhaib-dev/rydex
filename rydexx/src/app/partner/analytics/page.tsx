"use client";

import { useEffect, useState } from "react";
import { 
  IndianRupee, 
  TrendingUp, 
  Star, 
  Gift, 
  Car,
  Activity,
  Award,
  ChevronLeft,
  Clock,
  Percent,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
} from "recharts";
import Link from "next/link";

export default function PartnerAnalytics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [chartTab, setChartTab] = useState<"daily" | "weekly" | "monthly">("monthly");

  useEffect(() => {
    fetch("/api/partner/analytics")
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setData(res.data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-zinc-800 border-t-amber-400 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white">
        <Activity size={48} className="text-zinc-700 mb-4" />
        <h2 className="text-xl font-bold">No Data Available</h2>
        <p className="text-zinc-500 mt-2">Complete some rides to view analytics.</p>
      </div>
    );
  }

  const { summary, charts } = data;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Analytics</h1>
          <p className="text-gray-500 mt-1">Track your earnings, performance, and rides.</p>
        </div>
        <div className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-200">
          Pro Status
        </div>
      </div>

      <div className="space-y-6">
        
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Earnings"
            value={`₹${summary.totalEarnings.toLocaleString()}`}
            icon={<IndianRupee size={20} className="text-emerald-400" />}
            trend="+12% this month"
            delay={0.1}
          />
          <MetricCard
            title="Commissions"
            value={`₹${summary.totalCommissions.toLocaleString()}`}
            icon={<TrendingUp size={20} className="text-red-400" />}
            trend="20% standard cut"
            delay={0.2}
          />
          <MetricCard
            title="Avg Rating"
            value={summary.averageRating.toFixed(1)}
            icon={<Star size={20} className="text-amber-400" />}
            trend="Based on top 50"
            delay={0.3}
          />
          <MetricCard
            title="Total Tips"
            value={`₹${summary.totalTips.toLocaleString()}`}
            icon={<Gift size={20} className="text-purple-400" />}
            trend="Customer appreciation"
            delay={0.4}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <MetricCard
            title="Completion Rate"
            value={`${summary.completionRate || 100}%`}
            icon={<Percent size={20} className="text-blue-400" />}
            trend="All Accepted Rides"
            delay={0.45}
          />
          <MetricCard
            title="Active Hours"
            value={`${summary.activeHours || 0}h`}
            icon={<Clock size={20} className="text-orange-400" />}
            trend="Total Drive Time"
            delay={0.5}
          />
        </div>

        {/* Chart Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm relative overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 relative z-10 gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-gray-900">Earnings Over Time</h2>
              <p className="text-xs text-gray-500 mt-1">
                {chartTab === "daily" ? "Last 14 days" : chartTab === "weekly" ? "Last 6 weeks" : "Last 6 months"}
              </p>
            </div>
            
            <div className="flex p-1 bg-gray-50 rounded-xl border border-gray-200">
              {(["daily", "weekly", "monthly"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setChartTab(tab)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                    chartTab === tab 
                      ? "bg-white text-gray-900 shadow-sm border border-gray-200" 
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[300px] w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts[chartTab]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#6b7280', fontSize: 12 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  tickFormatter={(val) => `₹${val}`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', color: '#111827' }}
                  itemStyle={{ color: '#fbbf24' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="earnings" 
                  stroke="#fbbf24" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorEarnings)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Bottom Quick Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <div className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                <Car size={20} className="text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold tracking-wide">Total Rides</p>
                <p className="text-2xl font-black text-gray-900 mt-0.5">{summary.totalRides}</p>
              </div>
            </div>
            <Award size={32} className="text-gray-200" />
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
                <Activity size={20} className="text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold tracking-wide">Distance Covered</p>
                <p className="text-2xl font-black text-gray-900 mt-0.5">{summary.totalDistanceKm} <span className="text-base font-medium text-gray-400">km</span></p>
              </div>
            </div>
            <div className="w-16 h-8 rounded-full bg-emerald-500/10 blur-xl absolute right-8" />
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="flex flex-col h-full justify-center z-10">
              <p className="text-xs text-gray-500 font-semibold tracking-wide mb-1">Success Rate</p>
              <div className="flex items-end gap-2">
                <p className="text-2xl font-black text-gray-900">{summary.completionRate || 100}%</p>
              </div>
            </div>
            <div className="w-24 h-24 absolute right-2 top-1/2 -translate-y-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart 
                  cx="50%" 
                  cy="50%" 
                  innerRadius="60%" 
                  outerRadius="90%" 
                  barSize={8} 
                  data={[{ name: "Rate", value: summary.completionRate || 100, fill: "#10b981" }]}
                  startAngle={90}
                  endAngle={-270}
                >
                  <RadialBar background={{ fill: '#f3f4f6' }} cornerRadius={10} dataKey="value" />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, trend, delay }: { title: string, value: string | number, icon: any, trend: string, delay: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-gray-500 font-semibold tracking-wide">{title}</p>
        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-700">
          {icon}
        </div>
      </div>
      <p className="text-2xl lg:text-3xl font-black text-gray-900 tracking-tight mb-1">{value}</p>
      <div className="flex items-center gap-1">
        <TrendingUp size={14} className="text-emerald-500" />
        <span className="text-xs text-emerald-600 font-medium">{trend}</span>
      </div>
    </motion.div>
  );
}
