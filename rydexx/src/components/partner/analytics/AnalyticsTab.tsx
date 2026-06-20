"use client";

import { motion } from "motion/react";
import { BarChart2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";
import type { AnalyticsData, DashboardMode, TimeframeType } from "./types";

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

interface Props {
  data: AnalyticsData;
  dashboardMode: DashboardMode;
  timeframe: TimeframeType;
  onTimeframeChange: (t: TimeframeType) => void;
}

export function AnalyticsTab({ data, dashboardMode, timeframe, onTimeframeChange }: Props) {
  const activeChartData = data.charts[timeframe];
  const chartValues = activeChartData.map((d) => d.earnings);
  const maxEarning = chartValues.length ? Math.max(...chartValues) : 0;

  return (
    <motion.div
      key="analytics"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-gray-50 border border-gray-100 px-5 py-4 rounded-2xl">
        <div>
          <h4 className="text-sm font-bold text-gray-900 capitalize">
            {dashboardMode === "solo" ? `${timeframe} Earnings Trend` : `Aggregated ${timeframe} Fleet Revenue`}
          </h4>
          <p className="text-xs text-gray-400">Tapping items displays detail stats breakdown</p>
        </div>
        <div className="flex bg-gray-200 p-1 rounded-xl">
          {(["daily", "weekly", "monthly"] as TimeframeType[]).map((t) => (
            <button
              key={t}
              onClick={() => onTimeframeChange(t)}
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

      {/* Chart */}
      {activeChartData.length === 0 ? (
        <div className="h-64 border border-dashed rounded-2xl flex flex-col items-center justify-center bg-gray-50">
          <BarChart2 size={32} className="text-gray-400 mb-2" />
          <p className="text-sm font-bold text-gray-900">No earnings data for this timeframe</p>
        </div>
      ) : (
        <div className="h-64 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
            <BarChart
              data={
                dashboardMode === "solo"
                  ? activeChartData
                  : activeChartData.map((c) => ({ ...c, earnings: Math.round(c.earnings * 3.4) }))
              }
              barCategoryGap="25%"
            >
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
                      fill={isCurrent ? "#10b981" : isBest ? "#8b5cf6" : "#3b82f6"}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Legend */}
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
  );
}
