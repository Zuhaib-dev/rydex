"use client";

import { motion } from "framer-motion";
import { Car } from "lucide-react";

/* ─── Loading skeleton ─────────────────────────────────────────────── */
export function RideLoadingScreen() {
  return (
    <div className="h-screen w-full bg-zinc-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        {/* Pulsing car icon */}
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center"
        >
          <Car size={32} className="text-zinc-400" />
        </motion.div>

        {/* Skeleton bars */}
        <div className="flex flex-col items-center gap-3 w-48">
          <div className="h-2.5 w-full rounded-full bg-zinc-800 animate-pulse" />
          <div className="h-2.5 w-3/4 rounded-full bg-zinc-800 animate-pulse" />
        </div>

        <p className="text-zinc-600 text-xs tracking-[0.2em] uppercase font-medium">
          Loading ride…
        </p>
      </div>
    </div>
  );
}

/* ─── No active booking state ──────────────────────────────────────── */
export function NoActiveBookingScreen() {
  return (
    <div className="h-screen w-full bg-zinc-950 flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mb-8"
      >
        {/* Concentric rings */}
        <div className="w-32 h-32 rounded-full bg-zinc-800/40 flex items-center justify-center">
          <div className="w-24 h-24 rounded-full bg-zinc-800/60 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-zinc-700/60 flex items-center justify-center">
              <Car size={30} className="text-zinc-500" />
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        className="text-center max-w-xs"
      >
        <h1 className="text-white text-2xl font-black mb-2">No Active Ride</h1>
        <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
          You don&apos;t have any active booking right now. Go online to start
          receiving ride requests.
        </p>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => (window.location.href = "/")}
          className="bg-white text-zinc-900 px-8 py-4 rounded-2xl text-sm font-bold hover:bg-zinc-100 transition-colors"
        >
          Back to Dashboard
        </motion.button>
      </motion.div>
    </div>
  );
}
