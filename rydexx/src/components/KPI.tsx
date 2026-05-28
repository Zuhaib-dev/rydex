"use client";

import { motion, AnimatePresence } from "motion/react";
import React from "react";

interface KPIProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  pulsing?: boolean;
}

const KPI: React.FC<KPIProps> = ({
  title,
  value,
  icon,
  iconBgColor = "bg-purple-100",
  iconColor = "text-purple-600",
  pulsing = false,
}) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className={`relative overflow-hidden bg-white p-6 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-gray-100/50 flex flex-col gap-4 transition-shadow ${
        pulsing ? "ring-2 ring-emerald-100" : ""
      }`}
    >
      {pulsing && (
        <motion.div
          className="pointer-events-none absolute inset-0 bg-emerald-50/40"
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        />
      )}
      <div
        className={`w-12 h-12 rounded-xl ${iconBgColor} ${iconColor} flex items-center justify-center border border-white shadow-sm`}
      >
        {icon}
      </div>
      <div className="space-y-1">
        <p className="text-[11px] font-bold tracking-wider text-gray-500 uppercase">
          {title}
        </p>
        <AnimatePresence mode="popLayout">
          <motion.h3
            key={String(value)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="text-3xl font-black text-gray-900 leading-none tracking-tight tabular-nums"
          >
            {value}
          </motion.h3>
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default KPI;
