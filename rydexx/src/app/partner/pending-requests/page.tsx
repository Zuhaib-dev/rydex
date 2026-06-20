"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  MapPin,
  Navigation,
  Loader2,
  IndianRupee,
  Clock,
  Zap,
  Route,
  Bike,
  Car,
  Truck,
  Package,
  Tally3,
  PieChart,
} from "lucide-react";
import { getSocket } from "@/lib/socket";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { MATCH_ACCEPT_TIMEOUT_MS } from "@/lib/matching/config";
import { playNotificationSound, triggerHapticFeedback } from "@/lib/chatEffects";

type DispatchMeta = {
  distanceLabel?: string;
  distanceKm?: number;
  etaMinutes?: number;
  radiusKm?: number;
  expiresAt?: number;
};

type Booking = {
  _id: string;
  pickupAddress: string;
  dropAddress: string;
  fare: number;
  vehicleType?: string;
  tripDistanceKm?: number;
  durationMinutes?: number;
  createdAt: string;
  driverAssignedAt?: string;
  dispatch?: DispatchMeta;
  passengers?: number;
  notes?: string;
  scheduledAt?: string;
};

const ACCEPT_SECONDS = Math.floor(MATCH_ACCEPT_TIMEOUT_MS / 1000);

function RequestTimer({
  driverAssignedAt,
  onTimeout,
}: {
  driverAssignedAt?: string;
  onTimeout: () => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState(ACCEPT_SECONDS);

  useEffect(() => {
    const calculateTime = () => {
      const assigned = driverAssignedAt
        ? new Date(driverAssignedAt).getTime()
        : Date.now();
      const elapsed = Math.floor((Date.now() - assigned) / 1000);
      const remaining = Math.max(0, ACCEPT_SECONDS - elapsed);
      setSecondsLeft(remaining);
      if (remaining <= 0) onTimeout();
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [driverAssignedAt, onTimeout]);

  const urgent = secondsLeft <= 5;

  return (
    <motion.div
      animate={urgent ? { scale: [1, 1.04, 1] } : {}}
      transition={{ repeat: urgent ? Infinity : 0, duration: 0.8 }}
      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold shadow-sm border ${
        urgent
          ? "bg-red-50 border-red-200 text-red-700"
          : "bg-amber-50 border-amber-200 text-amber-700"
      }`}
    >
      <Clock size={12} className="animate-pulse shrink-0" />
      <span>{secondsLeft}s to respond</span>
    </motion.div>
  );
}

export default function VendorPendingPage() {
  const { data: session } = useSession();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const router = useRouter();

  const handleTimeout = useCallback((bookingId: string) => {
    setBookings((prev) => prev.filter((b) => b._id !== bookingId));
  }, []);

  const fetchPendingBookings = useCallback(async () => {
    if (!session?.user) {
      setLoading(false);
      return;
    }
    try {
      const res = await axios.get("/api/partner/bookings/pending");
      setBookings(res.data.bookings || []);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [session?.user]);

  useEffect(() => {
    if (session?.user?.id) fetchPendingBookings();
  }, [fetchPendingBookings, session?.user?.id]);

  useEffect(() => {
    const socket = getSocket();

    const handleConnect = () => {
      fetchPendingBookings();
    };

    const handleFocus = () => {
      fetchPendingBookings();
    };

    const handleNewBooking = (booking: Booking & { dispatch?: DispatchMeta }) => {
      let isNew = false;
      setBookings((prev) => {
        const alreadyExists = prev.some((existing) => existing._id === booking._id);
        if (alreadyExists) return prev;
        isNew = true;
        return [{ ...booking, dispatch: booking.dispatch }, ...prev];
      });
      if (isNew) {
        playNotificationSound("request");
        triggerHapticFeedback();
      }
    };

    const handleBookingUpdated = (data: {
      bookingId?: string;
      status?: string;
      _id?: string;
    }) => {
      const id = data.bookingId ?? data._id;
      if (!id) return;
      if (data.status === "expired" || (data.status && data.status !== "requested")) {
        setBookings((prev) => prev.filter((b) => b._id !== String(id)));
      }
    };

    socket.on("connect", handleConnect);
    socket.on("new-booking", handleNewBooking);
    socket.on("booking-updated", handleBookingUpdated);
    window.addEventListener("focus", handleFocus);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("new-booking", handleNewBooking);
      socket.off("booking-updated", handleBookingUpdated);
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchPendingBookings]);

  const handleAction = async (
    bookingId: string,
    action: "accept" | "reject",
  ) => {
    try {
      setProcessingId(bookingId);
      await axios.post(`/api/booking/${bookingId}/${action}`);
      setBookings((prev) => prev.filter((b) => b._id !== bookingId));
      if (action === "accept") {
        router.push("/partner/active-ride");
      }
    } catch {
      alert("Action failed");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-8">
        <button
          onClick={() => router.push("/")}
          className="mb-6 w-11 h-11 rounded-2xl bg-white border border-zinc-200 shadow-sm flex items-center justify-center hover:bg-zinc-50 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft size={17} className="text-zinc-900" />
        </button>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Live requests from nearby riders — respond before the timer ends.</p>
      </div>
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin w-8 h-8 text-gray-700" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center shadow-sm">
            <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-4">
              <Zap size={24} className="text-zinc-400" />
            </div>
            <p className="text-gray-500 text-lg">Waiting for nearby ride requests…</p>
            <p className="text-gray-400 text-sm mt-2">
              Keep location on — you&apos;ll be matched when a rider books nearby.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnimatePresence mode="popLayout">
              {bookings.map((booking) => {
                const partnerEarnings = Math.round(booking.fare * 0.9);
                return (
                  <motion.div
                    key={booking._id}
                    layout
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, y: -20 }}
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    className="bg-white rounded-3xl border border-zinc-200 p-1 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all overflow-hidden relative group"
                  >
                    <div className="bg-zinc-50 rounded-[22px] p-6 lg:p-7 relative overflow-hidden">
                      {/* Accent Header */}
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex flex-col gap-2">
                          <span className="inline-flex items-center gap-1.5 bg-[#B9F5AD]/20 text-emerald-900 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border border-[#B9F5AD]/40">
                            {(() => {
                              switch (booking.vehicleType?.toLowerCase()) {
                                case "bike": return <Bike size={12} />;
                                case "auto": return <Tally3 size={12} />;
                                case "car": return <Car size={12} />;
                                case "loading": return <Package size={12} />;
                                case "truck": return <Truck size={12} />;
                                default: return <Car size={12} />;
                              }
                            })()}
                            <span>{booking.vehicleType || "car"}</span>
                          </span>
                          <span className="text-xs font-bold text-zinc-400 font-mono tracking-wider ml-1">
                            #{booking._id.slice(-6).toUpperCase()}
                          </span>
                        </div>
                        <RequestTimer
                          driverAssignedAt={booking.driverAssignedAt}
                          onTimeout={() => handleTimeout(booking._id)}
                        />
                      </div>

                      {/* Locations */}
                      <div className="relative pl-8 space-y-6 mb-8">
                        {/* Timeline Track */}
                        <div className="absolute left-3.5 top-2.5 bottom-2.5 w-[2px] bg-zinc-200 rounded-full" />
                        
                        <div className="relative">
                          <div className="absolute -left-8 top-1 bg-white p-1 rounded-full border border-zinc-200 z-10 shadow-sm">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          </div>
                          <p className="text-xs uppercase text-zinc-400 font-bold tracking-wider mb-1">Pickup</p>
                          <p className="text-zinc-900 font-semibold text-lg leading-tight pr-4">
                            {booking.pickupAddress}
                          </p>
                        </div>

                        <div className="relative">
                          <div className="absolute -left-8 top-1 bg-white p-1 rounded-full border border-zinc-200 z-10 shadow-sm">
                            <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                          </div>
                          <p className="text-xs uppercase text-zinc-400 font-bold tracking-wider mb-1">Drop</p>
                          <p className="text-zinc-900 font-semibold text-lg leading-tight pr-4">
                            {booking.dropAddress}
                          </p>
                        </div>
                      </div>

                      {/* Details Strip */}
                      {(booking.passengers || booking.notes || booking.dispatch?.etaMinutes) && (
                        <div className="flex flex-wrap items-center gap-2 mb-6">
                          {booking.passengers && (
                            <span className="inline-flex items-center gap-1.5 bg-white border border-zinc-200 text-zinc-700 text-xs font-semibold px-3 py-1.5 rounded-xl shadow-sm">
                              <span className="text-zinc-400">Seats:</span> {booking.passengers} Pax
                            </span>
                          )}
                          {booking.dispatch?.etaMinutes != null && (
                            <span className="inline-flex items-center gap-1.5 bg-white border border-zinc-200 text-zinc-700 text-xs font-semibold px-3 py-1.5 rounded-xl shadow-sm">
                              <Route size={12} className="text-zinc-400" /> {booking.dispatch.etaMinutes} min away
                            </span>
                          )}
                          {booking.notes && (
                            <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200/50 text-amber-800 text-xs font-semibold px-3 py-1.5 rounded-xl shadow-sm truncate max-w-[200px]">
                              "{booking.notes}"
                            </span>
                          )}
                        </div>
                      )}

                      {/* Pricing & Actions */}
                      <div className="bg-white rounded-[20px] p-5 border border-zinc-200/60 shadow-sm mt-4">
                        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-6">
                          <div>
                            <p className="text-[11px] font-bold tracking-widest text-zinc-400 uppercase mb-1">Customer fare</p>
                            <div className="flex items-start gap-1 text-4xl font-black text-zinc-900 tracking-tight">
                              <span className="text-2xl mt-1 text-zinc-400">₹</span>
                              {booking.fare}
                            </div>
                          </div>
                          <div className="lg:text-right">
                            <p className="text-sm font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg inline-block border border-emerald-100">
                              Your est. earning ₹{partnerEarnings}
                            </p>
                            {booking.tripDistanceKm && (
                              <p className="text-xs font-medium text-zinc-500 mt-2 flex items-center lg:justify-end gap-1.5">
                                <MapPin size={12} /> {booking.tripDistanceKm} km total trip
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                          <motion.button
                            whileTap={{ scale: 0.96 }}
                            onClick={() => handleAction(booking._id, "reject")}
                            disabled={processingId === booking._id}
                            className="flex-1 lg:flex-none lg:w-1/3 px-4 py-4 rounded-xl border-2 border-zinc-200 bg-white text-zinc-600 text-sm font-bold hover:bg-zinc-50 hover:border-zinc-300 hover:text-zinc-900 transition-colors disabled:opacity-50"
                          >
                            Decline
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.96 }}
                            whileHover={{ scale: 1.01 }}
                            onClick={() => handleAction(booking._id, "accept")}
                            disabled={processingId === booking._id}
                            className="flex-2 px-4 py-4 rounded-xl bg-[#B9F5AD] text-emerald-950 text-base font-black shadow-[0_4px_14px_rgba(185,245,173,0.4)] hover:bg-[#a5e998] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {processingId === booking._id ? (
                              <Loader2 className="animate-spin w-5 h-5" />
                            ) : (
                              <>
                                <Zap size={18} className="fill-emerald-950" />
                                Accept Request
                              </>
                            )}
                          </motion.button>
                        </div>
                      </div>

                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
    </div>
  );
}
