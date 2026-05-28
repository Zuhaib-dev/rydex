"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Radio, MapPin } from "lucide-react";

type Props = {
  message?: string;
  radiusKm?: number;
  etaMinutes?: number;
  className?: string;
};

export default function MatchingStatusBanner({
  message,
  radiusKm,
  etaMinutes,
  className = "",
}: Props) {
  const label =
    message ||
    (radiusKm
      ? `Searching within ${radiusKm} km…`
      : "Searching nearby riders…");

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={label}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        className={`flex flex-col items-center gap-2 ${className}`}
      >
        <div className="inline-flex items-center gap-2 bg-zinc-100 border border-zinc-200 px-3 py-1.5 rounded-full">
          <Radio size={12} className="text-emerald-600 animate-pulse" />
          <span className="text-zinc-600 text-xs font-semibold">{label}</span>
        </div>
        {(radiusKm || etaMinutes) && (
          <div className="flex items-center gap-3 text-[11px] text-zinc-400 font-medium">
            {radiusKm ? (
              <span className="inline-flex items-center gap-1">
                <MapPin size={11} /> {radiusKm} km radius
              </span>
            ) : null}
            {etaMinutes ? <span>~{etaMinutes} min to pickup</span> : null}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
