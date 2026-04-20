import { motion } from "motion/react";
import React from "react";

interface KPIProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBgColor?: string;
  iconColor?: string;
}

const KPI: React.FC<KPIProps> = ({
  title,
  value,
  icon,
  iconBgColor = "bg-purple-100",
  iconColor = "text-purple-600",
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-gray-100/50 flex flex-col gap-4"
    >
      <div
        className={`w-12 h-12 rounded-xl ${iconBgColor} ${iconColor} flex items-center justify-center border border-white shadow-sm`}
      >
        {icon}
      </div>
      <div className="space-y-1">
        <p className="text-[11px] font-bold tracking-wider text-gray-500 uppercase">
          {title}
        </p>
        <h3 className="text-3xl font-black text-gray-900 leading-none tracking-tight">
          {value}
        </h3>
      </div>
    </motion.div>
  );
};

export default KPI;
