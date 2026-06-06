"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { useBookingRealtime } from "@/hooks/useBookingRealtime";
import {
  MapPin,
  Navigation,
  Car,
  Bike,
  Truck,
  Package,
  Tally3,
  ChevronUp,
  Loader2,
  Zap,
  Phone,
  Shield,
  Copy,
  Share2,
  Star,
  CheckCircle,
  X,
  AlertTriangle
} from "lucide-react";
import toast from "react-hot-toast";

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

interface DriverState {
  _id: string;
  name: string;
  mobileNumber?: string;
  ratingAverage?: number;
  ratingCount?: number;
  image?: string;
}

interface VehicleState {
  _id: string;
  type: string;
  brand?: string;
  vehicleModel: string;
  vehicleNumber: string;
  color?: string;
}

interface BookingState {
  _id: string;
  status: Status;
  pickupAddress?: string;
  dropAddress?: string;
  vehicleType?: string;
  driver?: DriverState;
  vehicle?: VehicleState;
  pickupOtp?: string;
  dropOtp?: string;
  tripDistanceKm?: number;
  durationMinutes?: number;
  driverMobileNumber?: string;
}

export default function GlobalDynamicIsland() {
  const pathname = usePathname();
  const router = useRouter();
  const [booking, setBooking] = useState<BookingState | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [triggeringSos, setTriggeringSos] = useState(false);

  // Hide on pages where full map tracking dashboard or admin controls are displayed
  const isHiddenPage =
    pathname.startsWith("/ride/") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/partner");

  useEffect(() => {
    const fetchActiveRide = async () => {
      try {
        const res = await fetch("/api/booking/my-active");
        if (!res.ok) return;
        const data = await res.json();
        if (data.booking) {
          setBooking(data.booking);
        }
      } catch (err) {
        // silently ignore
      }
    };
    if (!isHiddenPage) {
      fetchActiveRide();
    }
  }, [isHiddenPage, pathname]);

  useBookingRealtime<BookingState>({
    bookingId: booking?._id,
    enabled: Boolean(booking?._id && !isHiddenPage),
    setBooking: (val) => setBooking(val),
    onStatusChange: (nextStatus) => {
      if (["completed", "cancelled", "rejected", "expired"].includes(nextStatus as string)) {
        setTimeout(() => {
          setBooking(null);
          setIsExpanded(false);
        }, 4000); // linger for 4s, then collapse and hide
      }
    },
  });

  // Collapse if user clicks outside of the expanded Dynamic Island
  useEffect(() => {
    if (!isExpanded) return;
    const collapseIsland = () => setIsExpanded(false);
    window.addEventListener("click", collapseIsland);
    return () => window.removeEventListener("click", collapseIsland);
  }, [isExpanded]);

  if (isHiddenPage || !booking) return null;

  const isActive = ["requested", "awaiting_payment", "confirmed", "arriving", "arrived", "started"].includes(
    booking.status
  );

  const isTerminal = ["completed", "cancelled", "rejected", "expired"].includes(booking.status);

  if (!isActive && !isTerminal) return null;

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
        return { text: "Trip In Progress", color: "bg-blue-400" };
      case "completed":
        return { text: "Trip Completed ✅", color: "bg-zinc-400" };
      case "cancelled":
        return { text: "Trip Cancelled ❌", color: "bg-red-500" };
      default:
        return { text: "Active Ride", color: "bg-white" };
    }
  };

  const config = getStatusConfig(booking.status);

  const getVehicleIcon = (type?: string) => {
    const cls = "text-white fill-white/20";
    switch (type) {
      case "bike":
        return <Bike size={15} className={cls} />;
      case "auto":
        return <Tally3 size={15} className={cls} />;
      case "car":
        return <Car size={15} className={cls} />;
      case "loading":
        return <Package size={15} className={cls} />;
      case "truck":
        return <Truck size={15} className={cls} />;
      default:
        return <Car size={15} className={cls} />;
    }
  };

  // Determine current OTP code to show
  const activeOtp = booking.status === "started" ? booking.dropOtp : booking.pickupOtp;
  const otpLabel = booking.status === "started" ? "Drop OTP" : "Pickup OTP";

  // Trigger immediate SOS to admin dashboard
  const handleSos = async () => {
    if (!booking?._id) return;
    if (!confirm("🚨 SOS EMERGENCY: Are you in immediate danger? Tapping OK sends an emergency signal to our dispatch tower.")) return;
    
    setTriggeringSos(true);
    const toastId = toast.loading("Sending emergency SOS alert...");
    try {
      const res = await fetch(`/api/booking/${booking._id}/sos`, { method: "POST" });
      if (res.ok) {
        toast.success("SOS Alert Sent! Emergency support dispatched.", { id: toastId });
      } else {
        throw new Error();
      }
    } catch {
      toast.error("Failed to route SOS online. Please call emergency services (100).", { id: toastId });
    } finally {
      setTriggeringSos(false);
    }
  };

  // Share tracking link
  const handleShareLink = () => {
    if (!booking?._id) return;
    const shareUrl = `${window.location.origin}/ride/${booking._id}`;
    void navigator.clipboard.writeText(shareUrl);
    toast.success("Live tracking link copied to clipboard!");
  };

  return (
    <AnimatePresence>
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[999] pointer-events-auto">
        <motion.div
          layout
          onClick={(e) => {
            e.stopPropagation();
            if (!isTerminal) {
              setIsExpanded(!isExpanded);
            }
          }}
          className="bg-zinc-950/95 border border-white/10 shadow-[0_24px_50px_rgba(0,0,0,0.65)] backdrop-blur-xl rounded-[32px] overflow-hidden text-white flex flex-col cursor-pointer select-none"
          animate={{
            width: isExpanded ? 360 : 210,
            height: isExpanded ? 350 : 48,
          }}
          transition={{
            type: "spring",
            stiffness: 350,
            damping: 30,
          }}
        >
          {/* ── COMPACT STATE (PILL) ── */}
          <motion.div layout className="flex items-center justify-between px-4 h-12 shrink-0">
            <div className="flex items-center gap-2">
              <span className={`relative flex h-2 w-2`}>
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.color} opacity-75`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${config.color}`} />
              </span>
              <motion.span layout className="text-white text-xs font-black uppercase tracking-wider">
                {config.text}
              </motion.span>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center animate-pulse shrink-0">
                {getVehicleIcon(booking.vehicleType)}
              </div>
              {!isExpanded && booking.durationMinutes && (
                <span className="text-[10px] bg-white/15 px-2 py-0.5 rounded-full font-bold font-mono">
                  {Math.round(booking.durationMinutes)}m
                </span>
              )}
            </div>
          </motion.div>

          {/* ── EXPANDED STATE (DETAILS PANEL) ── */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="px-5 pb-5 flex flex-col flex-1 gap-4 overflow-y-auto scrollbar-hide select-text"
                onClick={(e) => e.stopPropagation()} // Stop propagation so interactions don't close widget
              >
                <div className="h-px w-full bg-white/10 shrink-0" />

                {/* Driver Profile Section */}
                {booking.driver && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center font-black text-sm text-purple-300 shrink-0">
                      {booking.driver.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-white truncate">{booking.driver.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star size={11} className="fill-amber-400 text-amber-400" />
                        <span className="text-[10px] text-zinc-400 font-bold">{booking.driver.ratingAverage?.toFixed(1) || "4.8"} ({booking.driver.ratingCount || 10})</span>
                      </div>
                    </div>
                    {(booking.driver.mobileNumber || booking.driverMobileNumber) && (
                      <a
                        href={`tel:${booking.driver.mobileNumber || booking.driverMobileNumber}`}
                        className="w-9 h-9 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 flex items-center justify-center transition"
                      >
                        <Phone size={14} />
                      </a>
                    )}
                  </div>
                )}

                {/* Vehicle Specifications */}
                {booking.vehicle && (
                  <div className="flex items-center justify-between gap-3 bg-white/5 border border-white/5 p-3 rounded-2xl">
                    <div className="min-w-0">
                      <p className="text-[9px] text-zinc-400 uppercase tracking-widest font-bold">Vehicle Details</p>
                      <p className="text-xs font-bold text-white truncate mt-0.5 uppercase">
                        {booking.vehicle.color} {booking.vehicle.brand} {booking.vehicle.vehicleModel}
                      </p>
                    </div>
                    <div className="font-mono text-zinc-950 bg-amber-400 border border-amber-300 rounded px-2.5 py-0.5 text-xs font-black uppercase tracking-wider select-all shadow-inner shrink-0">
                      {booking.vehicle.vehicleNumber}
                    </div>
                  </div>
                )}

                {/* Progress Indicators */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold">
                    <span className="truncate max-w-[140px] flex items-center gap-1">
                      <MapPin size={10} className="text-emerald-400" /> {booking.pickupAddress || "Pickup"}
                    </span>
                    <span className="truncate max-w-[140px] flex items-center gap-1 justify-end">
                      <Navigation size={10} className="text-rose-400" /> {booking.dropAddress || "Destination"}
                    </span>
                  </div>
                  
                  {/* Animated Progress Bar */}
                  <div className="relative w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="absolute left-0 top-0 h-full bg-purple-500"
                      initial={{ width: "10%" }}
                      animate={{ width: booking.status === "started" ? "65%" : "25%" }}
                      transition={{ duration: 1.5, ease: "easeInOut" }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-zinc-500 font-medium">
                    <span>Dist: {booking.tripDistanceKm ? `${booking.tripDistanceKm.toFixed(1)} km` : "Calculable"}</span>
                    <span>Remaining: {booking.durationMinutes ? `${Math.round(booking.durationMinutes)} min` : "Est..."}</span>
                  </div>
                </div>

                {/* Secure OTP and Tracking Details */}
                {activeOtp && (
                  <div className="bg-white/5 border border-white/5 p-3 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-[9px] text-zinc-400 uppercase tracking-wider font-bold">{otpLabel}</p>
                      <p className="text-sm font-extrabold text-white tracking-widest mt-0.5">{activeOtp}</p>
                    </div>
                    <button
                      onClick={() => {
                        void navigator.clipboard.writeText(activeOtp);
                        toast.success(`${otpLabel} copied!`);
                      }}
                      className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 shrink-0 pt-1">
                  <button
                    onClick={handleSos}
                    disabled={triggeringSos}
                    className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-2xl text-[11px] font-black uppercase tracking-wider transition flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/10 active:scale-95"
                  >
                    <AlertTriangle size={13} />
                    SOS Emergency
                  </button>

                  <button
                    onClick={handleShareLink}
                    className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition active:scale-95"
                    title="Share Live Trip Link"
                  >
                    <Share2 size={14} />
                  </button>

                  <button
                    onClick={() => {
                      if (booking.status === "awaiting_payment") {
                        router.push(`/checkout?bookingId=${booking._id}`);
                      } else {
                        router.push(`/ride/${booking._id}`);
                      }
                      setIsExpanded(false);
                    }}
                    className="px-4 py-3 bg-white hover:bg-zinc-100 text-zinc-950 rounded-2xl text-[11px] font-black uppercase tracking-wider transition active:scale-95"
                  >
                    Full Map
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
