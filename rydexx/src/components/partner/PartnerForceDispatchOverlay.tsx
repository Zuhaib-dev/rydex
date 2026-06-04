"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { getSocket } from "@/lib/socket";
import { ShieldCheck, Zap, ArrowRight, BellRing } from "lucide-react";

export default function PartnerForceDispatchOverlay() {
  const { data: session } = useSession();
  const { userData } = useSelector((state: RootState) => state.user);
  const router = useRouter();
  const pathname = usePathname();

  const [activeDispatch, setActiveDispatch] = useState<{
    bookingId: string;
    pickupAddress?: string;
    dropAddress?: string;
    fare?: number;
  } | null>(null);

  const [countdown, setCountdown] = useState(3);

  // Check if current user is a partner
  const isPartner = userData?.role === "partner" || session?.user?.role === "partner";

  useEffect(() => {
    if (!isPartner) return;

    const socket = getSocket();

    const handleBookingUpdated = (data: any) => {
      // If we are already on the active ride tracking page, do nothing
      if (pathname.startsWith("/partner/active-ride")) return;

      // Force dispatch transitions booking directly to "awaiting_payment"
      if (data.status === "awaiting_payment" && data.bookingId) {
        setActiveDispatch({
          bookingId: data.bookingId,
          pickupAddress: data.pickupAddress,
          dropAddress: data.dropAddress,
          fare: data.fare,
        });
        setCountdown(3);
      }
    };

    socket.on("booking-updated", handleBookingUpdated);

    return () => {
      socket.off("booking-updated", handleBookingUpdated);
    };
  }, [isPartner, pathname]);

  // Countdown timer effect
  useEffect(() => {
    if (!activeDispatch) return;

    if (countdown <= 0) {
      // Auto-redirect to active ride page
      router.push("/partner/active-ride");
      setActiveDispatch(null);
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [activeDispatch, countdown, router]);

  const handleGoNow = () => {
    router.push("/partner/active-ride");
    setActiveDispatch(null);
  };

  return (
    <AnimatePresence>
      {activeDispatch && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md">
          {/* Card Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative w-full max-w-md overflow-hidden bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl text-center"
          >
            {/* Subtle glow behind card */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />

            {/* Icon */}
            <div className="relative mx-auto w-16 h-16 bg-emerald-950/50 border border-emerald-500/30 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/5 mb-6">
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <Zap className="text-emerald-400 w-8 h-8 fill-emerald-400/20" />
              </motion.div>
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800">
                <BellRing className="text-emerald-400 w-3 h-3 animate-bounce" />
              </div>
            </div>

            {/* Typography */}
            <h3 className="text-2xl font-black text-white tracking-tight mb-2">
              Ride Force Dispatched!
            </h3>
            <p className="text-zinc-400 text-sm font-medium mb-6 px-4">
              Admin has assigned you to a new booking. You are automatically accepted.
            </p>

            {/* Route Summary */}
            {(activeDispatch.pickupAddress || activeDispatch.dropAddress) && (
              <div className="bg-zinc-950/50 border border-zinc-800/80 rounded-2xl p-4 text-left mb-6 space-y-3">
                {activeDispatch.pickupAddress && (
                  <div className="flex gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-wider text-zinc-500">Pickup</p>
                      <p className="text-xs font-semibold text-zinc-300 truncate max-w-[280px]">
                        {activeDispatch.pickupAddress}
                      </p>
                    </div>
                  </div>
                )}
                {activeDispatch.dropAddress && (
                  <div className="flex gap-2.5">
                    <div className="w-2 h-2 rounded-sm bg-zinc-400 shrink-0 mt-1.5" />
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-wider text-zinc-500">Drop</p>
                      <p className="text-xs font-semibold text-zinc-400 truncate max-w-[280px]">
                        {activeDispatch.dropAddress}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Countdown Progress */}
            <div className="space-y-2 mb-8">
              <div className="flex justify-between items-center text-xs font-bold text-zinc-400 px-1">
                <span>Redirecting in</span>
                <span className="text-emerald-400">{countdown}s</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-850 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 3, ease: "linear" }}
                  className="h-full bg-emerald-500 rounded-full"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleGoNow}
                className="w-full h-12 bg-white hover:bg-zinc-100 text-zinc-950 font-black text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
              >
                <span>Go to Ride</span>
                <ArrowRight size={15} />
              </button>
            </div>

            {/* Trust badge */}
            <div className="flex items-center justify-center gap-1.5 mt-6 pt-5 border-t border-zinc-800/60">
              <ShieldCheck size={12} className="text-zinc-500" />
              <span className="text-zinc-500 text-[9px] font-semibold tracking-wider uppercase">Auto-Assigned Booking</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
