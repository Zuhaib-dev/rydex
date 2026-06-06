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
} from "lucide-react";
import { getSocket } from "@/lib/socket";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { MATCH_ACCEPT_TIMEOUT_MS } from "@/lib/matching/config";

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

    const handleNewBooking = (booking: Booking & { dispatch?: DispatchMeta }) => {
      setBookings((prev) =>
        prev.some((existing) => existing._id === booking._id)
          ? prev
          : [{ ...booking, dispatch: booking.dispatch }, ...prev],
      );
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

    socket.on("new-booking", handleNewBooking);
    socket.on("booking-updated", handleBookingUpdated);
    return () => {
      socket.off("new-booking", handleNewBooking);
      socket.off("booking-updated", handleBookingUpdated);
    };
  }, []);

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
    <div className="min-h-screen bg-[#f4f5f7]">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex items-start gap-4">
            <button
              onClick={() => router.back()}
              className="w-11 h-11 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 shrink-0"
              aria-label="Go back"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-4xl font-semibold text-gray-900">
                Ride Requests
              </h1>
              <p className="mt-3 text-gray-500 text-lg">
                Live requests from nearby riders — respond before the timer ends.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
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
          <div className="space-y-6">
            <AnimatePresence mode="popLayout">
              {bookings.map((booking) => {
                const partnerEarnings = Math.round(booking.fare * 0.9);
                return (
                  <motion.div
                    key={booking._id}
                    layout
                    initial={{ opacity: 0, y: 20, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ type: "spring", stiffness: 320, damping: 28 }}
                    className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm hover:shadow-lg transition-shadow overflow-hidden relative"
                  >
                    <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-zinc-900 via-emerald-500 to-zinc-900" />

                    <div className="flex flex-wrap justify-between items-center gap-3 border-b border-gray-100 pb-4 mb-6">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-gray-400 font-mono tracking-wider">
                          #{booking._id.slice(-6).toUpperCase()}
                        </span>
                        {booking.vehicleType && (
                          <span className="inline-flex items-center gap-1.5 bg-zinc-950 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-sm">
                            {(() => {
                              switch (booking.vehicleType.toLowerCase()) {
                                case "bike": return <Bike size={10} className="text-zinc-300" />;
                                case "auto": return <Tally3 size={10} className="text-zinc-300" />;
                                case "car": return <Car size={10} className="text-zinc-300" />;
                                case "loading": return <Package size={10} className="text-zinc-300" />;
                                case "truck": return <Truck size={10} className="text-zinc-300" />;
                                default: return <Car size={10} className="text-zinc-300" />;
                              }
                            })()}
                            <span>{booking.vehicleType}</span>
                          </span>
                        )}
                      </div>
                      <RequestTimer
                        driverAssignedAt={booking.driverAssignedAt}
                        onTimeout={() => handleTimeout(booking._id)}
                      />
                    </div>

                    {booking.dispatch && (
                      <div className="flex flex-wrap gap-2 mb-5">
                        {booking.dispatch.distanceLabel && (
                          <span className="inline-flex items-center gap-1.5 bg-zinc-100 text-zinc-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                            <MapPin size={12} />
                            {booking.dispatch.distanceLabel} away
                          </span>
                        )}
                        {booking.dispatch.etaMinutes != null && (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 text-xs font-semibold px-3 py-1.5 rounded-full border border-emerald-100">
                            <Route size={12} />~{booking.dispatch.etaMinutes} min to pickup
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
                      <div className="flex-1 space-y-5">
                        <div className="flex gap-4">
                          <div className="bg-gray-100 p-3 rounded-lg shrink-0">
                            <MapPin size={18} />
                          </div>
                          <div>
                            <p className="text-xs uppercase text-gray-400 mb-1">
                              Pickup
                            </p>
                            <p className="text-gray-900 font-medium">
                              {booking.pickupAddress}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-4">
                          <div className="bg-gray-100 p-3 rounded-lg shrink-0">
                            <Navigation size={18} />
                          </div>
                          <div>
                            <p className="text-xs uppercase text-gray-400 mb-1">
                              Drop
                            </p>
                            <p className="text-gray-900 font-medium">
                              {booking.dropAddress}
                            </p>
                          </div>
                        </div>

                        {(booking.passengers || booking.notes) && (
                          <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-4 mt-4 space-y-3">
                            <div className="flex items-center gap-4 text-xs font-semibold text-zinc-600">
                              {booking.passengers && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-black uppercase text-zinc-400 font-bold">Seats:</span>
                                  <span className="text-zinc-900 font-bold bg-zinc-200/60 px-2 py-0.5 rounded-md">{booking.passengers} Pax</span>
                                </div>
                              )}
                              {booking.scheduledAt && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-black uppercase text-zinc-400 font-bold">Schedule:</span>
                                  <span className="text-zinc-900 font-bold bg-zinc-200/60 px-2 py-0.5 rounded-md">
                                    {new Date(booking.scheduledAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                </div>
                              )}
                            </div>
                            {booking.notes && (
                              <div className="text-xs border-t border-zinc-200/40 pt-2.5">
                                <span className="text-[10px] font-black uppercase text-zinc-400 font-bold block mb-1">Driver Instructions:</span>
                                <p className="text-zinc-800 font-medium italic">"{booking.notes}"</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-stretch lg:items-end gap-5 lg:min-w-[220px]">
                        <div className="text-left lg:text-right">
                          <p className="text-xs text-gray-400 uppercase mb-1">
                            Customer fare
                          </p>
                          <div className="flex items-center gap-1 text-3xl font-bold text-gray-900 lg:justify-end">
                            <IndianRupee size={20} />
                            {booking.fare}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            Your est. earning ₹{partnerEarnings}
                            {booking.tripDistanceKm
                              ? ` · ${booking.tripDistanceKm} km`
                              : ""}
                          </p>
                        </div>

                        <div className="flex gap-3">
                          <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={() => handleAction(booking._id, "reject")}
                            disabled={processingId === booking._id}
                            className="flex-1 px-5 py-3 rounded-xl border border-gray-300 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
                          >
                            Decline
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.97 }}
                            whileHover={{ scale: 1.02 }}
                            onClick={() => handleAction(booking._id, "accept")}
                            disabled={processingId === booking._id}
                            className="flex-1 px-6 py-3 rounded-xl bg-zinc-900 text-white text-sm font-semibold shadow-md hover:bg-black disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {processingId === booking._id ? (
                              <Loader2 className="animate-spin w-5 h-5" />
                            ) : (
                              <>
                                <Zap size={16} className="text-amber-400" />
                                Accept
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
    </div>
  );
}
