"use client";

import { motion } from "motion/react";
import React from "react";

interface AnimateCardProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

const AnimateCard: React.FC<AnimateCardProps> = ({
  title,
  icon,
  children,
  delay = 0,
  className = "",
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={`bg-white rounded-4xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/50 ${className}`}
    >
      <div className="flex items-center gap-3 mb-6">
        {icon && (
          <div className="p-2 bg-gray-50 rounded-xl text-gray-900 border border-gray-100 shadow-sm">
            {icon}
          </div>
        )}
        <h3 className="text-xl font-black text-gray-900 tracking-tight">
          {title}
        </h3>
      </div>
      <div>{children}</div>
    </motion.div>
  );
};

export default AnimateCard;
