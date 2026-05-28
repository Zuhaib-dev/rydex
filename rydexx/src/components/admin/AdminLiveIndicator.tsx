"use client";

import { motion, AnimatePresence } from "motion/react";
import { Wifi, WifiOff, Loader2 } from "lucide-react";
import { useAdminRealtime, type AdminConnectionStatus } from "@/hooks/useAdminRealtime";

const LABELS: Record<AdminConnectionStatus, string> = {
  connecting: "Connecting…",
  connected: "Live",
  reconnecting: "Reconnecting…",
  disconnected: "Offline",
};

export default function AdminLiveIndicator() {
  const { connectionStatus, lastUpdateAt } = useAdminRealtime();
  const isLive = connectionStatus === "connected";

  return (
    <div className="flex items-center gap-3">
      <motion.div
        layout
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] ${
          isLive
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : connectionStatus === "reconnecting" || connectionStatus === "connecting"
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : "border-gray-200 bg-gray-50 text-gray-500"
        }`}
      >
        <AnimatePresence mode="wait">
          {connectionStatus === "connecting" || connectionStatus === "reconnecting" ? (
            <motion.span
              key="loading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Loader2 size={12} className="animate-spin" />
            </motion.span>
          ) : isLive ? (
            <motion.span
              key="live"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative flex h-2 w-2"
            >
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </motion.span>
          ) : (
            <motion.span
              key="off"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <WifiOff size={12} />
            </motion.span>
          )}
        </AnimatePresence>
        <span>{LABELS[connectionStatus]}</span>
        {isLive && <Wifi size={12} className="opacity-60" />}
      </motion.div>

      {lastUpdateAt && (
        <motion.p
          key={lastUpdateAt}
          initial={{ opacity: 0, x: 6 }}
          animate={{ opacity: 1, x: 0 }}
          className="hidden text-[10px] font-medium text-gray-400 sm:block"
        >
          Synced {formatRelative(lastUpdateAt)}
        </motion.p>
      )}
    </div>
  );
}

function formatRelative(ts: number) {
  const sec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  return `${min}m ago`;
}
