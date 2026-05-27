"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, Zap, Calendar, BarChart2, Star, Wallet,
  Flame, Award, Fuel, Percent, BadgeAlert, Layers, Trophy, CheckCircle, Info
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell
} from "recharts";
import axios from "axios";

type TabType = "overview" | "analytics" | "settlements" | "goals";
type TimeframeType = "daily" | "weekly" | "monthly";

interface ChartItem {
  date: string;
  earnings: number;
  ridesCount: number;
}

interface AnalyticsData {
  summary: {
    totalEarnings: number;
    totalRides: number;
    stripePayouts: number;
    cashCollected: number;
    pendingCommission: number;
    totalDistanceKm: number;
  };
  fuel: {
    vehicleType: string;
    efficiency: number;
    fuelType: string;
    pricePerUnit: number;
    consumed: number;
    estimatedCost: number;
    netProfit: number;
  };
  streaks: {
    currentStreak: number;
    ridesToday: number;
    dailyGoal: number;
    dailyGoalBonus: number;
    dailyGoalAchieved: boolean;
  };
  charts: {
    daily: ChartItem[];
    weekly: ChartItem[];
    monthly: ChartItem[];
  };
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl shadow-xl p-4 min-w-[140px]">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-xl font-bold text-gray-900 font-mono">₹{payload[0].value.toLocaleString("en-IN")}</p>
        <p className="text-[10px] text-gray-400 font-medium mt-1">{payload[0].payload.ridesCount} Completed Rides</p>
      </div>
    );
  }
  return null;
};

export default function PartnerAnalyticsHub() {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [timeframe, setTimeframe] = useState<TimeframeType>("daily");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get("/api/partner/analytics")
      .then((res) => {
        if (res.data?.success) {
          setData(res.data.data);
        }
      })
      .catch((err) => console.error("Error fetching analytics data:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="w-full bg-white rounded-[28px] border border-gray-100 p-8 shadow-sm flex flex-col gap-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded-full" />
        <div className="h-12 w-full bg-gray-100 rounded-2xl" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-32 bg-gray-50 rounded-2xl" />
          <div className="h-32 bg-gray-50 rounded-2xl" />
          <div className="h-32 bg-gray-50 rounded-2xl" />
        </div>
        <div className="h-64 bg-gray-50 rounded-2xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-full bg-white rounded-[28px] border border-gray-100 p-12 text-center shadow-sm">
        <p className="text-gray-500 font-medium">Failed to load financial records. Please try again.</p>
      </div>
    );
  }

  const { summary, fuel, streaks, charts } = data;
  const activeChartData = charts[timeframe];
  const chartValues = activeChartData.map((d) => d.earnings);
  const maxEarning = chartValues.length ? Math.max(...chartValues) : 0;

  // Mock regional leaderboard data
  const LEADERBOARD = [
    { rank: 1, name: "Pradeep S.", rides: 38, bonus: "₹500", highlight: false },
    { rank: 2, name: "Ranjeet K.", rides: 32, bonus: "₹300", highlight: false },
    { rank: 3, name: "Suresh M.", rides: 29, bonus: "₹200", highlight: false },
    { rank: 4, name: "You (Partner)", rides: summary.totalRides, bonus: streaks.dailyGoalAchieved ? "₹250" : "—", highlight: true },
    { rank: 5, name: "Vikram R.", rides: 24, bonus: "—", highlight: false },
  ];

  return (
    <div className="w-full bg-white rounded-[28px] border border-gray-100 shadow-[0_8px_30px_rgba(0,0,0,0.02)] p-6">
      
      {/* ── HEADER & TABS BAR ── */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between border-b border-gray-100 pb-6 mb-6">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase text-violet-700 bg-violet-50 px-3 py-1 rounded-full mb-2">
            <Layers size={11} />
            Hub Control
          </span>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Earnings & Performance</h2>
          <p className="text-sm text-gray-400 mt-0.5">Manage your financial payouts, targets, and goals</p>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-gray-100 p-1.5 rounded-2xl overflow-x-auto self-start md:self-center">
          {(["overview", "analytics", "settlements", "goals"] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-black  tracking-wider rounded-xl transition-all duration-300 capitalize shrink-0 ${
                activeTab === tab
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-gray-400 hover:text-zinc-900"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        
        {/* ═══ TAB 1: OVERVIEW ═══ */}
        {activeTab === "overview" && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Quick Balance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <div className="bg-linear-to-br from-zinc-900 to-zinc-800 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
                <div className="absolute right-4 top-4 bg-white/10 p-2 rounded-xl text-white/70">
                  <Wallet size={18} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-1">Gross Earnings</p>
                <h3 className="text-3xl font-black tracking-tight font-mono">₹{summary.totalEarnings.toLocaleString("en-IN")}</h3>
                <p className="text-xs text-white/60 mt-4 font-semibold">{summary.totalRides} completed bookings</p>
              </div>

              <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 relative overflow-hidden">
                <div className="absolute right-4 top-4 bg-emerald-500/10 p-2 rounded-xl text-emerald-600">
                  <Star size={18} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700/60 mb-1">Stripe Payouts</p>
                <h3 className="text-3xl font-black tracking-tight text-emerald-700 font-mono">₹{summary.stripePayouts.toLocaleString("en-IN")}</h3>
                <p className="text-xs text-emerald-600/70 mt-4 font-bold">Transferred straight to bank</p>
              </div>

              <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-5 relative overflow-hidden">
                <div className="absolute right-4 top-4 bg-amber-500/10 p-2 rounded-xl text-amber-600">
                  <Flame size={18} className={streaks.currentStreak > 0 ? "animate-bounce" : ""} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700/60 mb-1">Active Streak</p>
                <h3 className="text-3xl font-black tracking-tight text-amber-700 font-mono">{streaks.currentStreak} Day{streaks.currentStreak !== 1 ? "s" : ""}</h3>
                <p className="text-xs text-amber-600/70 mt-4 font-bold">Keep the drive going! 🔥</p>
              </div>

            </div>

            {/* Performance Achievement Widget */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              
              {/* Daily Target Progress */}
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 flex items-center justify-between gap-6">
                <div className="space-y-2">
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full">
                    <Award size={10} /> Daily Goal
                  </span>
                  <h4 className="text-lg font-bold text-gray-900">Today's Ride Bonus</h4>
                  <p className="text-xs text-gray-400 font-medium">Complete {streaks.dailyGoal} rides today to unlock an extra ₹{streaks.dailyGoalBonus} bonus.</p>
                  
                  <div className="flex items-center gap-2 mt-4 text-sm font-black text-gray-800">
                    <span>{streaks.ridesToday} of {streaks.dailyGoal} rides</span>
                    {streaks.dailyGoalAchieved && (
                      <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1 font-bold">
                        <CheckCircle size={10} /> Unlocked
                      </span>
                    )}
                  </div>
                </div>

                <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                  {/* Progress Circle SVG */}
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="48" cy="48" r="38" strokeWidth="8" stroke="#e5e7eb" fill="transparent" />
                    <circle
                      cx="48" cy="48" r="38" strokeWidth="8"
                      stroke={streaks.dailyGoalAchieved ? "#10b981" : "#000"}
                      strokeDasharray={2 * Math.PI * 38}
                      strokeDashoffset={(2 * Math.PI * 38) * (1 - Math.min(streaks.ridesToday, streaks.dailyGoal) / streaks.dailyGoal)}
                      strokeLinecap="round" fill="transparent"
                    />
                  </svg>
                  <span className="absolute text-xl font-bold font-mono">
                    {Math.round((Math.min(streaks.ridesToday, streaks.dailyGoal) / streaks.dailyGoal) * 100)}%
                  </span>
                </div>
              </div>

              {/* Fuel and Distance Snapshot */}
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 flex items-center justify-between gap-6">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full">
                    <Fuel size={10} /> Mileage tracking
                  </span>
                  <h4 className="text-lg font-bold text-gray-900">Efficiency Estimates</h4>
                  <p className="text-xs text-gray-400 font-medium">Estimated fuel consumption tracking for your {fuel.vehicleType.toUpperCase()} based on a total distance of {summary.totalDistanceKm} km.</p>
                  
                  <div className="grid grid-cols-2 gap-4 pt-3">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Consumed</p>
                      <p className="text-sm font-black text-gray-800 font-mono">{fuel.consumed} {fuel.fuelType === "CNG" ? "kg" : "L"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fuel Cost</p>
                      <p className="text-sm font-black text-gray-800 font-mono">₹{fuel.estimatedCost}</p>
                    </div>
                  </div>
                </div>
                <div className="w-14 h-14 bg-zinc-900 rounded-2xl flex items-center justify-center shrink-0 shadow-lg text-white">
                  <Fuel size={24} />
                </div>
              </div>

            </div>
          </motion.div>
        )}

        {/* ═══ TAB 2: ANALYTICS ═══ */}
        {activeTab === "analytics" && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Header controls for chart */}
            <div className="flex items-center justify-between flex-wrap gap-4 bg-gray-50 border border-gray-100 px-5 py-4 rounded-2xl">
              <div>
                <h4 className="text-sm font-bold text-gray-900 capitalize">{timeframe} Earnings Trend</h4>
                <p className="text-xs text-gray-400">Tapping items displays detail stats breakdown</p>
              </div>

              {/* Timeframe selector */}
              <div className="flex bg-gray-200 p-1 rounded-xl">
                {(["daily", "weekly", "monthly"] as TimeframeType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTimeframe(t)}
                    className={`px-3 py-1.5 text-2xs font-bold tracking-wider rounded-lg transition-all capitalize ${
                      timeframe === t
                        ? "bg-white text-zinc-900 shadow-sm"
                        : "text-gray-400 hover:text-zinc-900"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Recharts Graphical Display */}
            {activeChartData.length === 0 ? (
              <div className="h-64 border border-dashed rounded-2xl flex flex-col items-center justify-center bg-gray-50">
                <BarChart2 size={32} className="text-gray-400 mb-2" />
                <p className="text-sm font-bold text-gray-900">No earnings data for this timeframe</p>
              </div>
            ) : (
              <div className="h-64 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activeChartData} barCategoryGap="25%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: "#9ca3af", fontWeight: 500 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#9ca3af" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => "₹" + (v >= 1000 ? (v / 1000).toFixed(0) + "k" : v)}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "#fafafa", radius: 8 }} />
                    <Bar dataKey="earnings" radius={[6, 6, 2, 2]}>
                      {activeChartData.map((entry, index) => {
                        const isCurrent = index === activeChartData.length - 1;
                        const isBest = entry.earnings === maxEarning && !isCurrent;
                        return (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              isCurrent
                                ? "#10b981" // Current unit is green
                                : isBest
                                ? "#8b5cf6" // Best performance is violet
                                : "#3b82f6" // General bars are blue
                            }
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Chart Legend */}
            <div className="flex items-center gap-6 justify-center text-xs text-gray-500 pt-2 border-t border-gray-50">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                <span>Current Timeframe</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-violet-500" />
                <span>Best Peak Performance</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
                <span>General Earnings</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══ TAB 3: SETTLEMENTS ═══ */}
        {activeTab === "settlements" && (
          <motion.div
            key="settlements"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Financial Ledger grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* stripe and cash collections */}
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 space-y-4">
                <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Percent size={16} className="text-zinc-700" />
                  Ledger Splits
                </h4>

                <div className="divide-y divide-gray-100">
                  <div className="flex justify-between py-3">
                    <span className="text-xs text-gray-400 font-semibold">Direct Digital Earnings (Online Payments)</span>
                    <span className="text-sm font-bold text-gray-900 font-mono">₹{summary.stripePayouts}</span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="text-xs text-gray-400 font-semibold">Direct Cash Collections (Kept by you)</span>
                    <span className="text-sm font-bold text-gray-900 font-mono">₹{summary.cashCollected}</span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="text-xs text-gray-400 font-semibold">Pending Platform Commission (10%)</span>
                    <span className="text-sm font-bold text-red-600 font-mono">₹{summary.pendingCommission}</span>
                  </div>
                </div>

                {summary.pendingCommission > 0 && (
                  <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3.5 mt-2">
                    <BadgeAlert size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] font-black text-amber-800 uppercase tracking-wider">Settlement Notification</p>
                      <p className="text-2xs text-amber-700 mt-0.5 leading-relaxed font-medium">You have collected cash bookings. The platform commission of ₹{summary.pendingCommission} will be automatically deducted from your upcoming digital Stripe payouts.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* fuel estimator detail */}
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 space-y-4">
                <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Fuel size={16} className="text-zinc-700" />
                  Fuel & Efficiency Estimator
                </h4>

                <div className="divide-y divide-gray-100">
                  <div className="flex justify-between py-3">
                    <span className="text-xs text-gray-400 font-semibold">Vehicle Economy Class</span>
                    <span className="text-sm font-bold text-gray-800 uppercase">{fuel.vehicleType}</span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="text-xs text-gray-400 font-semibold">Estimated Economy Rate</span>
                    <span className="text-sm font-bold text-gray-800 font-mono">{fuel.efficiency} km/{fuel.fuelType === "CNG" ? "kg" : "L"}</span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="text-xs text-gray-400 font-semibold">Fuel Price Average</span>
                    <span className="text-sm font-bold text-gray-800 font-mono">₹{fuel.pricePerUnit} per unit</span>
                  </div>
                  <div className="flex justify-between py-3 bg-zinc-900 text-white rounded-xl px-3.5 mt-2">
                    <span className="text-xs text-white/70 font-bold self-center">Est. Net Profit (Earnings - Fuel)</span>
                    <span className="text-lg font-black font-mono py-2">₹{fuel.netProfit.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>

            </div>

            <div className="flex items-center gap-2.5 bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs text-gray-500 font-medium leading-relaxed">
              <Info size={16} className="text-gray-400 shrink-0" />
              <span>Fuel estimates are calculated using straight line travel multipliers and average vehicle metrics. Payout settlements are processed weekly every Monday directly to the bank account registered during onboarding.</span>
            </div>
          </motion.div>
        )}

        {/* ═══ TAB 4: GOALS ═══ */}
        {activeTab === "goals" && (
          <motion.div
            key="goals"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,1.3fr)] gap-6">
              
              {/* Left gamified streaks achievements */}
              <div className="space-y-4">
                <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Flame size={16} className="text-orange-500" />
                  Your Active Targets
                </h4>

                <div className="bg-linear-to-br from-amber-50 to-orange-50/50 border border-amber-100 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md">
                      <Flame size={20} className="animate-pulse" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-amber-900">Consecutive Days Streak</p>
                      <p className="text-xs text-amber-700/80 font-medium">Complete at least 1 booking daily to keep your streak.</p>
                    </div>
                  </div>

                  <div className="flex items-baseline gap-2 pt-2">
                    <span className="text-5xl font-black text-amber-800 font-mono">{streaks.currentStreak}</span>
                    <span className="text-sm font-bold text-amber-700">Days Active</span>
                  </div>

                  <div className="w-full h-2 bg-amber-200/50 rounded-full overflow-hidden mt-2">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${Math.min((streaks.currentStreak / 7) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] font-bold text-amber-600 tracking-wider text-right">{streaks.currentStreak}/7 Days to Streak Multiplier bonus (1.2x commission cut)</p>
                </div>

                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                      <Trophy size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">Streak Bonus Goal</p>
                      <p className="text-xs text-gray-400 font-medium">₹{streaks.dailyGoalBonus} bonus reward for {streaks.dailyGoal} rides.</p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                    streaks.dailyGoalAchieved ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"
                  }`}>
                    {streaks.dailyGoalAchieved ? "Claimed" : `${streaks.ridesToday}/${streaks.dailyGoal}`}
                  </div>
                </div>
              </div>

              {/* Regional Leaderboard Table */}
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 space-y-4">
                <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Trophy size={16} className="text-amber-500" />
                  Regional Leaderboard
                </h4>
                <p className="text-xs text-gray-400">Weekly rankings based on completed rides in your local sector.</p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200/80 text-gray-400 font-bold uppercase tracking-wider">
                        <th className="py-2.5 pl-2">Rank</th>
                        <th className="py-2.5">Driver</th>
                        <th className="py-2.5">Rides Completed</th>
                        <th className="py-2.5 pr-2 text-right">Est. Bonus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {LEADERBOARD.map((driver) => (
                        <tr
                          key={driver.rank}
                          className={`transition ${
                            driver.highlight
                              ? "bg-zinc-900 text-white font-bold rounded-xl"
                              : "text-gray-700 hover:bg-gray-100/50"
                          }`}
                        >
                          <td className="py-3 pl-3.5 rounded-l-xl font-mono">#{driver.rank}</td>
                          <td className="py-3">{driver.name}</td>
                          <td className="py-3 font-mono">{driver.rides} rides</td>
                          <td className="py-3 pr-3.5 text-right font-mono rounded-r-xl text-emerald-600 font-semibold">{driver.bonus}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </motion.div>
        )}

      </AnimatePresence>

    </div>
  );
}
