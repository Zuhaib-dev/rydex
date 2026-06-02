"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { useBookingRealtime } from "@/hooks/useBookingRealtime";
import { MapPin, Navigation, Car, ChevronRight, Loader2, Zap } from "lucide-react";

type Status =
  | "idle"
  | "requested"
  | "awaiting_payment"
  | "confirmed"
  | "arriving"
  | "arrived"
  | "started"
  | "completed"
  | "cancelled"
  | "rejected"
  | "expired";

interface BookingState {
  _id: string;
  status: Status;
  pickupAddress?: string;
  dropAddress?: string;
  vehicleType?: string;
  driver?: {
    name: string;
  };
}

export default function GlobalDynamicIsland() {
  const pathname = usePathname();
  const router = useRouter();
  const [booking, setBooking] = useState<BookingState | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Hide on specific pages where full tracking UI is already present
  const isHiddenPage =
    pathname.startsWith("/ride/") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/partner");

  useEffect(() => {
    // Fetch active booking on mount
    const fetchActiveRide = async () => {
      try {
        const res = await fetch("/api/booking/my-active");
        if (!res.ok) return;
        const data = await res.json();
        if (data.booking) {
          setBooking(data.booking);
        }
      } catch (err) {
        // Ignore silently
      }
    };
    fetchActiveRide();
  }, []);

  useBookingRealtime<BookingState>({
    bookingId: booking?._id,
    enabled: Boolean(booking?._id),
    setBooking: (val) => setBooking(val),
    onStatusChange: (nextStatus) => {
      if (["completed", "cancelled", "rejected", "expired"].includes(nextStatus as string)) {
        setTimeout(() => setBooking(null), 3000); // clear after 3s delay
      }
    },
  });

  if (isHiddenPage || !booking) return null;

  const isActive = ["requested", "awaiting_payment", "confirmed", "arriving", "arrived", "started"].includes(
    booking.status
  );

  if (!isActive) return null;

  const getStatusConfig = (status: Status) => {
    switch (status) {
      case "requested":
        return { text: "Finding Driver", color: "bg-amber-400" };
      case "awaiting_payment":
        return { text: "Payment Required", color: "bg-purple-400" };
      case "confirmed":
      case "arriving":
        return { text: "Driver En Route", color: "bg-emerald-400" };
      case "arrived":
        return { text: "Driver Arrived", color: "bg-sky-400" };
      case "started":
        return { text: "Ride in Progress", color: "bg-blue-400" };
      default:
        return { text: "Active Ride", color: "bg-white" };
    }
  };

  const config = getStatusConfig(booking.status);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -50, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -50, opacity: 0, scale: 0.9 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[999] pointer-events-auto"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => {
          if (booking.status === "awaiting_payment") router.push(`/checkout?bookingId=${booking._id}`);
          else router.push(`/ride/${booking._id}`);
        }}
      >
        <motion.div
          layout
          className="bg-zinc-950 shadow-2xl rounded-[32px] overflow-hidden border border-white/10 cursor-pointer flex flex-col"
          animate={{
            width: isHovered ? 340 : 180,
            height: isHovered ? (booking.status === "requested" ? 100 : 140) : 48,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
        >
          {/* Compact Pill State (Visible always, on top) */}
          <motion.div layout className="flex items-center justify-between px-4 h-12 shrink-0">
            <div className="flex items-center gap-2.5">
              {booking.status === "requested" ? (
                <Loader2 size={16} className="text-white animate-spin" />
              ) : (
                <div className={`w-2.5 h-2.5 rounded-full ${config.color} animate-pulse`} />
              )}
              <motion.span layout className="text-white text-xs font-bold tracking-wide">
                {config.text}
              </motion.span>
            </div>
            {isHovered && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white/10 p-1.5 rounded-full">
                <ChevronRight size={14} className="text-white" />
              </motion.div>
            )}
          </motion.div>

          {/* Expanded State Content */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="px-5 pb-5 flex flex-col flex-1"
              >
                <div className="h-px w-full bg-white/10 mb-4" />
                {booking.status === "requested" ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center">
                      <Zap size={18} className="text-amber-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-black">Hold tight</p>
                      <p className="text-sm font-semibold text-white">Connecting you...</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <MapPin size={14} className="text-zinc-400 shrink-0" />
                      <p className="text-xs text-white truncate font-medium">
                        {booking.pickupAddress || "Pickup location"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Navigation size={14} className="text-zinc-400 shrink-0" />
                      <p className="text-xs text-zinc-400 truncate font-medium">
                        {booking.dropAddress || "Drop location"}
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
