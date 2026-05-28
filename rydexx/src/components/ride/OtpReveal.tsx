"use client";

import { motion, AnimatePresence } from "motion/react";
import { KeyRound, X } from "lucide-react";

type OtpRevealProps = {
  type: "pickup" | "drop";
  otp: string;
  visible: boolean;
  onDismiss?: () => void;
};

export default function OtpReveal({ type, otp, visible, onDismiss }: OtpRevealProps) {
  const label = type === "pickup" ? "Pickup OTP" : "Drop OTP";
  const hint =
    type === "pickup"
      ? "Share this code with your driver to start the trip"
      : "Share this code with your driver to complete the trip";

  return (
    <AnimatePresence>
      {visible && otp && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-x-4 bottom-36 z-[60] mx-auto max-w-md lg:bottom-8 lg:right-[440px] lg:left-auto lg:mx-0"
        >
          <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-zinc-950 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-500/20 blur-2xl" />

            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="absolute right-3 top-3 rounded-full p-1 text-white/40 hover:bg-white/10 hover:text-white"
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            )}

            <div className="relative flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                <KeyRound size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400/90">
                  {label}
                </p>
                <motion.p
                  key={otp}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="mt-2 font-mono text-4xl font-black tracking-[0.35em] text-white"
                >
                  {otp}
                </motion.p>
                <p className="mt-2 text-xs leading-relaxed text-white/45">{hint}</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
