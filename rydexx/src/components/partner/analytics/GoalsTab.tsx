"use client";

import { motion } from "motion/react";
import { Flame, Trophy, Star, Info } from "lucide-react";
import type { AnalyticsData } from "./types";

interface Props {
  data: AnalyticsData;
  leaderboard: any[];
  userStats: any;
}

export function GoalsTab({ data, leaderboard, userStats }: Props) {
  const { streaks } = data;

  return (
    <motion.div
      key="goals"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,1.3fr)] gap-6">
        {/* Streak + daily target */}
        <div className="space-y-4">
          <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Flame size={16} className="text-orange-500" />
            Your Active Targets
          </h4>

          {/* Streak card */}
          <div className="bg-linear-to-br from-amber-50 to-orange-50/50 border border-amber-100 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md">
                <Flame size={20} className="animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-900">Consecutive Days Streak</p>
                <p className="text-xs text-amber-700/80 font-medium">
                  Complete at least 1 booking daily to keep your streak.
                </p>
              </div>
            </div>
            <div className="flex items-baseline gap-2 pt-2">
              <span className="text-5xl font-black text-amber-800 font-mono">{streaks.currentStreak}</span>
              <span className="text-sm font-bold text-amber-700">Days Active</span>
            </div>
            <div className="w-full h-2 bg-amber-200/50 rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-amber-500 rounded-full animate-pulse"
                style={{ width: `${Math.min((streaks.currentStreak / 7) * 100, 100)}%` }}
              />
            </div>
            <p className="text-[10px] font-bold text-amber-600 tracking-wider text-right">
              {streaks.currentStreak}/7 Days to Streak Multiplier bonus (1.2x commission cut)
            </p>
          </div>

          {/* Bonus goal card */}
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <Trophy size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Streak Bonus Goal</p>
                <p className="text-xs text-gray-400 font-medium">
                  ₹{streaks.dailyGoalBonus} bonus reward for {streaks.dailyGoal} rides.
                </p>
              </div>
            </div>
            <div
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                streaks.dailyGoalAchieved ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"
              }`}
            >
              {streaks.dailyGoalAchieved ? "Claimed" : `${streaks.ridesToday}/${streaks.dailyGoal}`}
            </div>
          </div>
        </div>

        {/* Regional Leaderboard */}
        <div className="bg-white/40 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] rounded-3xl p-6 space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />

          <div className="relative z-10 flex items-start justify-between">
            <div>
              <h4 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <Trophy size={20} className="text-amber-500" />
                Premium Leaderboard
              </h4>
              <p className="text-xs text-gray-500 mt-1">Ranking based on completed rides and 5-star ratings.</p>
            </div>
            {userStats && (
              <div className="bg-black/5 backdrop-blur-md border border-black/10 px-4 py-2 rounded-2xl text-right">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Your Rank</p>
                <p className="text-xl font-black text-gray-900 font-mono">#{userStats.rank}</p>
              </div>
            )}
          </div>

          <div className="overflow-x-auto relative z-10 mt-4">
            <table className="w-full text-left text-sm border-separate border-spacing-y-2">
              <thead>
                <tr className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                  <th className="py-2 px-4">Rank</th>
                  <th className="py-2 px-4">Partner Name</th>
                  <th className="py-2 px-4 text-center">Lifetime Rides</th>
                  <th className="py-2 px-4 text-center">Rating</th>
                  <th className="py-2 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-400 text-sm font-medium">
                      No drivers ranked yet.
                    </td>
                  </tr>
                ) : (
                  leaderboard.map((driver) => {
                    const isMe = userStats?.id === driver.id;
                    return (
                      <tr
                        key={driver.id}
                        className={`transition-all duration-300 ${
                          isMe
                            ? "bg-black text-white shadow-lg scale-[1.01]"
                            : driver.isPremiumPartner
                            ? "bg-linear-to-r from-amber-50/80 to-orange-50/50 hover:bg-amber-100/50"
                            : "bg-white/60 hover:bg-white"
                        }`}
                      >
                        <td
                          className={`py-4 px-4 rounded-l-2xl font-mono font-bold ${
                            driver.rank === 1 ? "text-amber-500 text-lg" :
                            driver.rank === 2 ? "text-slate-400 text-lg" :
                            driver.rank === 3 ? "text-orange-400 text-lg" : ""
                          }`}
                        >
                          #{driver.rank}
                        </td>
                        <td className="py-4 px-4 font-bold flex items-center gap-2">
                          {driver.name}{" "}
                          {isMe && (
                            <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                              You
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center font-mono">{driver.rides}</td>
                        <td className="py-4 px-4 text-center font-mono flex items-center justify-center gap-1">
                          {driver.rating.toFixed(1)}{" "}
                          <Star size={12} className={isMe ? "text-white" : "text-amber-400 fill-amber-400"} />
                        </td>
                        <td className="py-4 px-4 rounded-r-2xl text-right">
                          {driver.isPremiumPartner ? (
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black shadow-sm border ${
                                isMe
                                  ? "bg-amber-400 text-black border-amber-300"
                                  : "bg-linear-to-r from-amber-400 to-orange-400 text-white border-amber-200"
                              }`}
                            >
                              <Flame size={12} className={isMe ? "text-black" : "text-white"} />
                              PREMIUM
                            </span>
                          ) : (
                            <span className={`text-xs font-bold ${isMe ? "text-gray-300" : "text-gray-400"}`}>
                              Standard
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {!userStats?.isPremiumPartner && userStats && (
            <div className="mt-4 bg-blue-50/50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3">
              <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-blue-900">Reach the Top 10% to unlock Premium Priority!</p>
                <p className="text-[11px] text-blue-700 mt-1">
                  Premium Partners receive dispatch requests before standard drivers, even if they are slightly further away.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
