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
  ChevronLeft
} from "lucide-react";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import Link from "next/link";

export default function PartnerAnalytics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-amber-400 selection:text-black pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
              <ChevronLeft size={18} />
            </Link>
            <h1 className="text-lg font-black tracking-tight flex items-center gap-2">
              <Activity size={18} className="text-amber-400" />
              Performance Hub
            </h1>
          </div>
          <div className="bg-amber-400/10 text-amber-400 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-400/20">
            Pro Status
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
        
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

        {/* Chart Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="bg-white/5 border border-white/10 rounded-4xl p-6 backdrop-blur-md relative overflow-hidden"
        >
          {/* Decorative glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-amber-400/5 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="flex items-center justify-between mb-8 relative z-10">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Earnings Over Time</h2>
              <p className="text-xs text-zinc-400 mt-1">Monthly breakdown (last 6 months)</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
              <TrendingUp size={18} className="text-amber-400" />
            </div>
          </div>

          <div className="h-[300px] w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.monthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#71717a', fontSize: 12 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#71717a', fontSize: 12 }}
                  tickFormatter={(val) => `₹${val}`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}
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
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div className="bg-linear-to-br from-zinc-900 to-zinc-950 border border-white/5 rounded-3xl p-5 flex items-center justify-between shadow-2xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Car size={20} className="text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Total Rides</p>
                <p className="text-2xl font-black mt-0.5">{summary.totalRides}</p>
              </div>
            </div>
            <Award size={32} className="text-zinc-800" />
          </div>

          <div className="bg-linear-to-br from-zinc-900 to-zinc-950 border border-white/5 rounded-3xl p-5 flex items-center justify-between shadow-2xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Activity size={20} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Distance Covered</p>
                <p className="text-2xl font-black mt-0.5">{summary.totalDistanceKm} <span className="text-base font-medium text-zinc-500">km</span></p>
              </div>
            </div>
            <div className="w-16 h-8 rounded-full bg-emerald-500/20 blur-xl absolute right-8" />
          </div>
        </motion.div>

      </main>
    </div>
  );
}

function MetricCard({ title, value, icon, trend, delay }: { title: string, value: string | number, icon: any, trend: string, delay: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="bg-white/5 border border-white/10 rounded-4xl p-5 backdrop-blur-md hover:bg-white/10 transition-colors cursor-default"
    >
      <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center mb-4 shadow-inner border border-white/5">
        {icon}
      </div>
      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-1">{title}</p>
      <p className="text-2xl lg:text-3xl font-black tracking-tight mb-2">{value}</p>
      <div className="flex items-center gap-1.5">
        <TrendingUp size={12} className="text-zinc-500" />
        <span className="text-[10px] text-zinc-500 font-medium">{trend}</span>
      </div>
    </motion.div>
  );
}
