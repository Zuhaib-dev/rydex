"use client";

import { motion } from "motion/react";
import { Percent, Fuel, BadgeAlert, Info } from "lucide-react";
import type { AnalyticsData, DashboardMode } from "./types";

interface Props {
  data: AnalyticsData;
  dashboardMode: DashboardMode;
}

export function SettlementsTab({ data, dashboardMode }: Props) {
  const { summary, fuel } = data;
  const scale = dashboardMode === "fleet" ? 3.4 : 1;

  const fmt = (v: number) =>
    Math.round(v * scale).toLocaleString("en-IN");

  return (
    <motion.div
      key="settlements"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ledger splits */}
        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 space-y-4">
          <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Percent size={16} className="text-zinc-700" />
            Ledger Splits &amp; Payouts
          </h4>
          <div className="divide-y divide-gray-100">
            <div className="flex justify-between py-3">
              <span className="text-xs text-gray-400 font-semibold">Direct Digital Earnings (Online Payments)</span>
              <span className="text-sm font-bold text-gray-900 font-mono">₹{fmt(summary.stripePayouts)}</span>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-xs text-gray-400 font-semibold">Direct Cash Collections (Kept by you)</span>
              <span className="text-sm font-bold text-gray-900 font-mono">₹{fmt(summary.cashCollected)}</span>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-xs text-gray-400 font-semibold">Pending Platform Commission (10%)</span>
              <span className="text-sm font-bold text-red-600 font-mono">₹{fmt(summary.pendingCommission)}</span>
            </div>
          </div>
          {summary.pendingCommission > 0 && (
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3.5 mt-2">
              <BadgeAlert size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] font-black text-amber-800 uppercase tracking-wider">Settlement Notification</p>
                <p className="text-2xs text-amber-700 mt-0.5 leading-relaxed font-medium">
                  You have collected cash bookings. The platform commission of ₹{fmt(summary.pendingCommission)} will be
                  automatically deducted from your upcoming digital Stripe payouts.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Fuel estimator */}
        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 space-y-4">
          <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Fuel size={16} className="text-zinc-700" />
            Fuel &amp; Efficiency Estimator
          </h4>
          <div className="divide-y divide-gray-100">
            <div className="flex justify-between py-3">
              <span className="text-xs text-gray-400 font-semibold">Vehicle Economy Class</span>
              <span className="text-sm font-bold text-gray-800 uppercase">{fuel.vehicleType}</span>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-xs text-gray-400 font-semibold">Estimated Economy Rate</span>
              <span className="text-sm font-bold text-gray-800 font-mono">
                {fuel.efficiency} km/{fuel.fuelType === "CNG" ? "kg" : "L"}
              </span>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-xs text-gray-400 font-semibold">Fuel Price Average</span>
              <span className="text-sm font-bold text-gray-800 font-mono">₹{fuel.pricePerUnit} per unit</span>
            </div>
            <div className="flex justify-between py-3 bg-zinc-900 text-white rounded-xl px-3.5 mt-2">
              <span className="text-xs text-white/70 font-bold self-center">Est. Net Profit (Earnings - Fuel)</span>
              <span className="text-lg font-black font-mono py-2">
                ₹{Math.round(fuel.netProfit * scale).toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs text-gray-500 font-medium leading-relaxed">
        <Info size={16} className="text-gray-400 shrink-0" />
        <span>
          Fuel estimates are calculated using straight line travel multipliers and average vehicle metrics.
          Payout settlements are processed weekly every Monday directly to the bank account registered during onboarding.
        </span>
      </div>
    </motion.div>
  );
}
