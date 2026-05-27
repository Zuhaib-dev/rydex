"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Navigation,
  Car,
  Bike,
  Truck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User2,
  Star,
  IndianRupee,
} from "lucide-react";
import type { Metadata } from "next";

/* ── Types ─────────────────────────────────────────────────────────────── */
interface ShareBooking {
  _id: string;
  pickupAddress: string;
  dropAddress: string;
  pickupLocation: { coordinates: [number, number] };
  dropLocation: { coordinates: [number, number] };
  status: string;
  fare: number;
  vehicleType: string;
  sosTriggered: boolean;
  sosTriggeredAt?: string;
  driver?: {
    name: string;
    image?: string;
    ratingAverage?: number;
    ratingCount?: number;
    location?: { coordinates: [number, number] };
  };
  vehicle?: {
    type: string;
    vehicleModel: string;
    vehicleNumber: string;
  };
}

/* ── Lazy Mapbox ────────────────────────────────────────────────────────── */
const ShareMap = dynamic(() => import("@/components/ShareTripMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-zinc-900 animate-pulse flex items-center justify-center">
      <Car size={36} className="text-zinc-700 animate-bounce" />
    </div>
  ),
});

/* ── Status helpers ─────────────────────────────────────────────────────── */
const STATUS_INFO: Record<string, { label: string; color: string; dot: string }> = {
  requested: { label: "Searching for driver", color: "text-amber-400", dot: "bg-amber-400" },
  awaiting_payment: { label: "Awaiting payment", color: "text-purple-400", dot: "bg-purple-400" },
  confirmed: { label: "Driver on the way", color: "text-emerald-400", dot: "bg-emerald-400" },
  arriving: { label: "Driver on the way", color: "text-emerald-400", dot: "bg-emerald-400" },
  arrived: { label: "Driver arrived", color: "text-sky-400", dot: "bg-sky-400" },
  started: { label: "En route to destination", color: "text-blue-400", dot: "bg-blue-400" },
  completed: { label: "Trip completed", color: "text-zinc-400", dot: "bg-zinc-400" },
  cancelled: { label: "Ride cancelled", color: "text-red-400", dot: "bg-red-400" },
  rejected: { label: "Ride rejected", color: "text-red-400", dot: "bg-red-400" },
  expired: { label: "Request expired", color: "text-orange-400", dot: "bg-orange-400" },
};

const VEHICLE_ICON: Record<string, JSX.Element> = {
  bike: <Bike size={18} className="text-white" />,
  truck: <Truck size={18} className="text-white" />,
  loading: <Truck size={18} className="text-white" />,
  car: <Car size={18} className="text-white" />,
};

/* ══════════════════════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════════════════════ */
export default function ShareTripPage() {
  const { id } = useParams<{ id: string }>();
  const [booking, setBooking] = useState<ShareBooking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchShare = useCallback(async () => {
    try {
      const res = await fetch(`/api/booking/${id}/share`);
      if (!res.ok) throw new Error("Trip not found");
      const data = await res.json();
      setBooking(data.booking);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchShare();
    pollRef.current = setInterval(fetchShare, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchShare]);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="h-screen w-full bg-zinc-950 flex flex-col items-center justify-center gap-5">
        <div className="w-14 h-14 rounded-full border-2 border-white/10 border-t-white animate-spin" />
        <p className="text-white/40 text-sm tracking-widest uppercase font-medium">
          Loading trip…
        </p>
      </div>
    );
  }

  /* ── Error ── */
  if (error || !booking) {
    return (
      <div className="h-screen w-full bg-zinc-950 flex flex-col items-center justify-center px-6 gap-5">
        <div className="w-16 h-16 rounded-full bg-red-400/10 flex items-center justify-center">
          <AlertTriangle size={32} className="text-red-400" />
        </div>
        <div className="text-center">
          <h1 className="text-white font-bold text-xl mb-2">Trip Not Found</h1>
          <p className="text-zinc-500 text-sm">{error || "This share link may have expired."}</p>
        </div>
        <a
          href="/"
          className="mt-2 bg-white text-zinc-900 px-6 py-3 rounded-xl font-semibold text-sm hover:bg-zinc-100 transition-colors"
        >
          Go to Rydex
        </a>
      </div>
    );
  }

  const statusInfo = STATUS_INFO[booking.status] || STATUS_INFO.requested;
  const isFinished = ["completed", "cancelled", "rejected", "expired"].includes(booking.status);
  const vehicleType = booking.vehicle?.type || booking.vehicleType || "car";

  /* Driver position */
  const driverPos: [number, number] | null = booking.driver?.location?.coordinates
    ? [booking.driver.location.coordinates[1], booking.driver.location.coordinates[0]]
    : null;
  const pickupPos: [number, number] = [
    booking.pickupLocation.coordinates[1],
    booking.pickupLocation.coordinates[0],
  ];
  const dropPos: [number, number] = [
    booking.dropLocation.coordinates[1],
    booking.dropLocation.coordinates[0],
  ];

  return (
    <div className="h-screen w-full bg-zinc-950 flex flex-col overflow-hidden">
      {/* ── SOS Banner ── */}
      <AnimatePresence>
        {booking.sosTriggered && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-red-600 px-5 py-3.5 flex items-center justify-between gap-3 shadow-2xl shrink-0 z-50"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle size={18} className="text-white animate-bounce shrink-0" />
              <div>
                <p className="text-white text-sm font-black">🚨 SOS EMERGENCY ACTIVE</p>
                <p className="text-red-200 text-[11px]">
                  The passenger has triggered a panic alert. Help is on the way.
                </p>
              </div>
            </div>
            <a
              href="tel:112"
              className="bg-white text-red-600 px-3.5 py-1.5 rounded-xl text-xs font-black hover:bg-red-50 transition-colors shrink-0"
            >
              CALL 112
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <div className="bg-zinc-900/90 backdrop-blur-sm border-b border-zinc-800 px-5 py-4 shrink-0 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
            <Navigation size={14} className="text-white/60" />
          </div>
          <div>
            <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-semibold">
              Live Trip — Rydex
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${statusInfo.dot} animate-pulse shrink-0`} />
              <span className={`text-sm font-bold ${statusInfo.color}`}>{statusInfo.label}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-zinc-600 text-[10px] uppercase tracking-wider">Fare</p>
          <p className="text-white text-sm font-black flex items-center gap-0.5">
            <IndianRupee size={12} /> {booking.fare}
          </p>
        </div>
      </div>

      {/* ── Map ── */}
      <div className="relative flex-1 min-h-0">
        <ShareMap
          driverLocation={driverPos}
          pickupLocation={pickupPos}
          dropLocation={dropPos}
          status={booking.status}
          sosActive={booking.sosTriggered}
          vehicleType={vehicleType}
        />

        {/* Floating status pill on map */}
        {!isFinished && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none"
          >
            <div className="flex items-center gap-2 bg-zinc-950/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-zinc-800">
              <span className={`w-2 h-2 rounded-full ${statusInfo.dot} animate-pulse`} />
              <span className="text-white text-xs font-semibold">{statusInfo.label}</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* ── Bottom Sheet ── */}
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="bg-zinc-900 border-t border-zinc-800 px-5 pt-5 pb-8 shrink-0 z-10"
      >
        {/* Driver info */}
        {booking.driver && (
          <div className="flex items-center gap-4 mb-5">
            <div className="relative shrink-0">
              {booking.driver.image ? (
                <img
                  src={booking.driver.image}
                  alt={booking.driver.name}
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-zinc-700"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center">
                  <User2 size={26} className="text-zinc-500" />
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                {VEHICLE_ICON[vehicleType] || VEHICLE_ICON.car}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-semibold mb-0.5">
                Your Driver
              </p>
              <p className="text-white font-bold text-base truncate">{booking.driver.name}</p>
              {booking.vehicle && (
                <p className="text-zinc-400 text-xs mt-0.5">
                  {booking.vehicle.vehicleModel}{" "}
                  <span className="font-mono text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded ml-1">
                    {booking.vehicle.vehicleNumber}
                  </span>
                </p>
              )}
            </div>
            {typeof booking.driver.ratingAverage === "number" && (
              <div className="flex items-center gap-1 bg-zinc-800 px-3 py-1.5 rounded-full shrink-0">
                <Star size={12} className="text-amber-400 fill-amber-400" />
                <span className="text-white text-sm font-bold">
                  {booking.driver.ratingAverage.toFixed(1)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Route */}
        <div className="bg-zinc-800/50 rounded-2xl overflow-hidden border border-zinc-700/50">
          <div className="flex gap-3 p-4 border-b border-zinc-700/50">
            <div className="flex flex-col items-center pt-0.5 shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-400 border-2 border-zinc-900" />
              <div className="w-px bg-zinc-700 mt-1" style={{ height: 18 }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-0.5">
                Pickup
              </p>
              <p className="text-zinc-200 text-sm leading-snug">{booking.pickupAddress}</p>
            </div>
          </div>
          <div className="flex gap-3 p-4">
            <div className="pt-0.5 shrink-0">
              <div className="w-2.5 h-2.5 rounded-sm bg-emerald-400 border-2 border-zinc-900" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-0.5">
                Drop
              </p>
              <p className="text-zinc-200 text-sm leading-snug">{booking.dropAddress}</p>
            </div>
          </div>
        </div>

        {/* Completed state */}
        {booking.status === "completed" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3"
          >
            <CheckCircle2 size={22} className="text-emerald-400 shrink-0" />
            <div>
              <p className="text-emerald-400 text-sm font-bold">Trip Completed!</p>
              <p className="text-emerald-600 text-xs">The passenger has reached their destination.</p>
            </div>
          </motion.div>
        )}

        {/* Live update indicator */}
        {!isFinished && (
          <div className="mt-4 flex items-center justify-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-zinc-600 text-[10px] uppercase tracking-wider font-semibold">
              Updating live every 5 seconds
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
