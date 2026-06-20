"use client";

import { motion } from "motion/react";
import {
  Wallet, Star, Flame, Award, Fuel, CheckCircle, MapPin, Compass,
} from "lucide-react";
import type { AnalyticsData, DashboardMode } from "./types";

interface Props {
  data: AnalyticsData;
  dashboardMode: DashboardMode;
  demandData: any;
  onOpenDemandMap: () => void;
}

export function OverviewTab({ data, dashboardMode, demandData, onOpenDemandMap }: Props) {
  const { summary, fuel, streaks } = data;

  return (
    <motion.div
      key={`${dashboardMode}-overview`}
      initial={{ opacity: 0, y: 12 }}
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
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-1">
            {dashboardMode === "solo" ? "Gross Earnings" : "Aggregated Fleet Revenue"}
          </p>
          <h3 className="text-3xl font-black tracking-tight font-mono">
            ₹{dashboardMode === "solo"
              ? summary.totalEarnings.toLocaleString("en-IN")
              : (summary.totalEarnings * 3.4).toLocaleString("en-IN")}
          </h3>
          <p className="text-xs text-white/60 mt-4 font-semibold">
            {dashboardMode === "solo" ? summary.totalRides : Math.round(summary.totalRides * 3.4)} total bookings dispatched
          </p>
        </div>

        <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute right-4 top-4 bg-emerald-500/10 p-2 rounded-xl text-emerald-600">
            <Star size={18} />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700/60 mb-1">
            {dashboardMode === "solo" ? "Stripe Net Payout" : "Settled Fleet Payouts"}
          </p>
          <h3 className="text-3xl font-black tracking-tight text-emerald-700 font-mono">
            ₹{dashboardMode === "solo"
              ? summary.stripePayouts.toLocaleString("en-IN")
              : (summary.stripePayouts * 3.4).toLocaleString("en-IN")}
          </h3>
          <p className="text-xs text-emerald-600/70 mt-4 font-bold">Transferred straight to bank</p>
        </div>

        <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute right-4 top-4 bg-amber-500/10 p-2 rounded-xl text-amber-600">
            <Flame size={18} className={streaks.currentStreak > 0 ? "animate-bounce" : ""} />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700/60 mb-1">
            {dashboardMode === "solo" ? "Active Streak" : "Online Fleet Utilization"}
          </p>
          <h3 className="text-3xl font-black tracking-tight text-amber-700 font-mono">
            {dashboardMode === "solo" ? `${streaks.currentStreak} Days` : "92%"}
          </h3>
          <p className="text-xs text-amber-600/70 mt-4 font-bold">
            {dashboardMode === "solo" ? "Keep the drive going! 🔥" : "18 active / 20 registered fleet drivers"}
          </p>
        </div>
      </div>

      {/* Smart Dispatcher nudge */}
      {dashboardMode === "solo" && demandData?.recommendation && (
        <div className="bg-linear-to-br from-purple-900 to-indigo-950 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-6 border border-white/10">
          <div className="space-y-2 relative z-10 flex-1">
            <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-purple-200 bg-white/10 px-3 py-1 rounded-full">
              <Compass size={11} className="animate-spin text-amber-400" />
              AI Dispatch Recommendations
            </span>
            <h3 className="text-xl font-bold tracking-tight mt-2">
              {demandData.recommendation.isInside ? "Optimal Positioning Detected" : "Low Demand in Sector"}
            </h3>
            <p className="text-xs text-purple-100 leading-relaxed font-semibold">
              {demandData.recommendation.message}
            </p>
          </div>
          <button
            onClick={onOpenDemandMap}
            className="w-full md:w-auto shrink-0 px-6 py-3 bg-white text-zinc-950 font-black rounded-xl text-xs uppercase tracking-wider transition hover:bg-gray-100 flex items-center justify-center gap-1.5 shadow-lg active:scale-95 cursor-pointer"
          >
            <MapPin size={14} className="text-purple-700" />
            Open Live Demand Map
          </button>
        </div>
      )}

      {/* Performance + Efficiency widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily Target Progress */}
        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 flex items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full">
              <Award size={10} /> Daily Goal
            </span>
            <h4 className="text-lg font-bold text-gray-900">
              {dashboardMode === "solo" ? "Today's Ride Bonus" : "Aggregated Shift Targets"}
            </h4>
            <p className="text-xs text-gray-400 font-medium">
              {dashboardMode === "solo"
                ? `Complete ${streaks.dailyGoal} rides today to unlock an extra ₹${streaks.dailyGoalBonus} bonus.`
                : "Direct drivers to complete shifts. Current target threshold unlocks ₹2,500 fleet bonuses."}
            </p>
            <div className="flex items-center gap-2 mt-4 text-sm font-black text-gray-800">
              <span>
                {dashboardMode === "solo"
                  ? `${streaks.ridesToday} of ${streaks.dailyGoal} rides`
                  : "72 of 85 fleet rides"}
              </span>
              {(streaks.dailyGoalAchieved || dashboardMode === "fleet") && (
                <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1 font-bold">
                  <CheckCircle size={10} /> Unlocked
                </span>
              )}
            </div>
          </div>
          <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="48" cy="48" r="38" strokeWidth="8" stroke="#e5e7eb" fill="transparent" />
              <circle
                cx="48" cy="48" r="38" strokeWidth="8"
                stroke={streaks.dailyGoalAchieved || dashboardMode === "fleet" ? "#10b981" : "#000"}
                strokeDasharray={2 * Math.PI * 38}
                strokeDashoffset={
                  (2 * Math.PI * 38) *
                  (1 - (dashboardMode === "fleet" ? 72 : streaks.ridesToday) /
                    (dashboardMode === "fleet" ? 85 : streaks.dailyGoal))
                }
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <span className="absolute text-xl font-bold font-mono">
              {dashboardMode === "solo"
                ? Math.round((Math.min(streaks.ridesToday, streaks.dailyGoal) / streaks.dailyGoal) * 100)
                : 84}%
            </span>
          </div>
        </div>

        {/* Fuel snapshot */}
        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 flex items-center justify-between gap-6">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full">
              <Fuel size={10} /> Mileage tracking
            </span>
            <h4 className="text-lg font-bold text-gray-900">Efficiency Estimates</h4>
            <p className="text-xs text-gray-400 font-medium">
              {dashboardMode === "solo"
                ? `Estimated fuel consumption tracking for your ${fuel.vehicleType.toUpperCase()} based on ${summary.totalDistanceKm} km.`
                : `Estimated dynamic fleet mileage metrics calculated across ${Math.round(summary.totalDistanceKm * 3.4)} km.`}
            </p>
            <div className="grid grid-cols-2 gap-4 pt-3">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Consumed</p>
                <p className="text-sm font-black text-gray-800 font-mono">
                  {dashboardMode === "solo" ? `${fuel.consumed} L` : `${Math.round(fuel.consumed * 3.4)} L`}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fuel Cost</p>
                <p className="text-sm font-black text-gray-800 font-mono">
                  ₹{dashboardMode === "solo" ? fuel.estimatedCost : Math.round(fuel.estimatedCost * 3.2)}
                </p>
              </div>
            </div>
          </div>
          <div className="w-14 h-14 bg-zinc-900 rounded-2xl flex items-center justify-center shrink-0 shadow-lg text-white">
            <Fuel size={24} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
