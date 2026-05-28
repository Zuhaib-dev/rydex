"use client";

import { AnimatePresence, motion } from "motion/react";
import type { RealtimeToast } from "@/hooks/useBookingRealtime";

export default function RideToasts({
  toast,
}: {
  toast: (RealtimeToast & { id: number }) | null;
}) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-6 left-1/2 z-[100] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2"
        >
          <div
            className={`rounded-xl border px-4 py-3 text-sm font-semibold shadow-2xl backdrop-blur-md ${
              toast.type === "success"
                ? "border-emerald-500/30 bg-emerald-950/90 text-emerald-100"
                : toast.type === "error"
                  ? "border-red-500/30 bg-red-950/90 text-red-100"
                  : "border-white/10 bg-zinc-950/90 text-white"
            }`}
          >
            {toast.message}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
