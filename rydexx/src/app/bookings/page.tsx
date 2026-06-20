"use client";

import { motion, AnimatePresence } from "motion/react";
import axios from "axios";
import { ArrowLeft, Calendar, Car, IndianRupee, Loader2, MapPin, Navigation, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type UserBooking = {
  _id: string;
  pickupAddress: string;
  dropAddress: string;
  fare: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  vehicle?: {
    vehicleModel?: string;
    type?: string;
  };
  driver?: {
    name?: string;
  };
};

const statusClass: Record<string, string> = {
  requested: "bg-amber-50 text-amber-700 border-amber-200",
  awaiting_payment: "bg-blue-50 text-blue-700 border-blue-200",
  confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  arriving: "bg-sky-50 text-sky-700 border-sky-200",
  arrived: "bg-indigo-50 text-indigo-700 border-indigo-200",
  started: "bg-purple-50 text-purple-700 border-purple-200",
  completed: "bg-teal-50 text-teal-700 border-teal-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  expired: "bg-gray-50 text-gray-700 border-gray-200",
};

export default function MyBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<UserBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [selectedBooking, setSelectedBooking] = useState<UserBooking | null>(null);

  const handleBookingClick = (booking: UserBooking) => {
    const activeStatuses = ["requested", "awaiting_payment", "confirmed", "arriving", "arrived", "started"];
    if (activeStatuses.includes(booking.status)) {
      router.push(`/ride/${booking._id}`);
    } else {
      setSelectedBooking(booking);
    }
  };

  const fetchBookings = async (pageNum: number) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const res = await axios.get(`/api/user/bookings?page=${pageNum}&limit=10`);
      const newBookings = res.data.bookings || [];
      const pagination = res.data.pagination;

      if (pageNum === 1) {
        setBookings(newBookings);
      } else {
        setBookings((prev) => [...prev, ...newBookings]);
      }

      setHasMore(pageNum < (pagination?.pages || 1));
      setTotal(pagination?.total || 0);
    } catch (err) {
      if (pageNum === 1) setBookings([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchBookings(1);
  }, []);

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchBookings(next);
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200">
        <div className="max-w-5xl mx-auto px-4 py-6 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-xl border border-zinc-200 bg-white flex items-center justify-center hover:bg-zinc-50"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-zinc-900">My Bookings</h1>
            <p className="text-sm text-zinc-500 mt-1">{total} rides in your history</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-zinc-500" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center">
            <Car size={34} className="mx-auto text-zinc-300 mb-3" />
            <p className="font-bold text-zinc-900">No bookings yet</p>
            <p className="text-sm text-zinc-500 mt-1">Your ride history will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <button
                key={booking._id}
                onClick={() => handleBookingClick(booking)}
                className="w-full text-left bg-white border border-zinc-200 rounded-2xl p-5 hover:border-zinc-400 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center">
                        <Car size={18} />
                      </div>
                      <div>
                        <p className="font-black text-zinc-900">{booking.vehicle?.vehicleModel || "Standard Ride"}</p>
                        <p className="text-xs text-zinc-500">Driver: {booking.driver?.name || "Searching..."}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-zinc-700 flex gap-2">
                        <MapPin size={15} className="text-zinc-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{booking.pickupAddress}</span>
                      </p>
                      <p className="text-sm text-zinc-700 flex gap-2">
                        <Navigation size={15} className="text-zinc-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{booking.dropAddress}</span>
                      </p>
                    </div>
                  </div>
                  <div className="md:text-right shrink-0 space-y-2">
                    <span className={`inline-flex border px-3 py-1 rounded-full text-xs font-bold ${statusClass[booking.status] || statusClass.expired}`}>
                      {booking.status.replace("_", " ")}
                    </span>
                    <p className="text-xl font-black text-zinc-900 flex md:justify-end items-center gap-1">
                      <IndianRupee size={16} />
                      {booking.fare}
                    </p>
                    <p className="text-xs text-zinc-400 flex md:justify-end items-center gap-1">
                      <Calendar size={13} />
                      {new Date(booking.createdAt).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </button>
            ))}

            {hasMore && (
              <div className="pt-6 pb-4 flex justify-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-6 py-3 bg-zinc-900 text-white font-bold rounded-xl text-sm transition hover:bg-zinc-800 disabled:opacity-50 flex items-center gap-2"
                >
                  {loadingMore && <Loader2 size={16} className="animate-spin" />}
                  {loadingMore ? "Loading..." : "Load Older Bookings"}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Booking Details Modal */}
      <AnimatePresence>
        {selectedBooking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setSelectedBooking(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-zinc-50 border-b border-zinc-100 p-4 flex items-center justify-between">
                <h3 className="font-black text-zinc-900">Ride Details</h3>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="w-8 h-8 rounded-full bg-white border border-zinc-200 flex items-center justify-center hover:bg-zinc-100 transition-colors"
                >
                  <X size={16} className="text-zinc-500" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">
                <div className="flex justify-between items-start">
                  <div className="flex gap-3">
                    <div className="w-12 h-12 rounded-xl bg-zinc-900 text-white flex items-center justify-center">
                      <Car size={24} />
                    </div>
                    <div>
                      <p className="font-black text-lg text-zinc-900">{selectedBooking.vehicle?.vehicleModel || "Standard Ride"}</p>
                      <p className="text-sm text-zinc-500">Driver: {selectedBooking.driver?.name || "None"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex border px-3 py-1 rounded-full text-xs font-bold ${statusClass[selectedBooking.status] || statusClass.expired}`}>
                      {selectedBooking.status.replace("_", " ")}
                    </span>
                    <p className="text-2xl font-black text-zinc-900 flex items-center gap-1 mt-1 justify-end">
                      <IndianRupee size={18} />
                      {selectedBooking.fare}
                    </p>
                  </div>
                </div>

                <div className="relative pl-3 space-y-6">
                  {/* Vertical Line */}
                  <div className="absolute left-[21px] top-4 bottom-4 w-0.5 bg-zinc-200 z-0" />
                  
                  <div className="relative z-10 flex items-start gap-4">
                    <div className="w-5 h-5 mt-1 rounded-full bg-zinc-900 flex items-center justify-center shrink-0 shadow-[0_0_0_4px_white]">
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                    <div className="flex-1 bg-zinc-50 border border-zinc-100 rounded-xl p-3">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Pickup Location</p>
                      <p className="text-sm font-semibold text-zinc-900">{selectedBooking.pickupAddress}</p>
                    </div>
                  </div>

                  <div className="relative z-10 flex items-start gap-4">
                    <div className="w-5 h-5 mt-1 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 shadow-[0_0_0_4px_white]">
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                    <div className="flex-1 bg-zinc-50 border border-zinc-100 rounded-xl p-3">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Drop-off Location</p>
                      <p className="text-sm font-semibold text-zinc-900">{selectedBooking.dropAddress}</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-zinc-100">
                  <div className="text-sm text-zinc-500 flex items-center gap-1.5">
                    <Calendar size={16} />
                    {new Date(selectedBooking.createdAt).toLocaleString("en-IN", {
                      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                    })}
                  </div>
                  <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                    ID: {selectedBooking._id.slice(-6)}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
