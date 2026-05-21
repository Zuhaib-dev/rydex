"use client";

import axios from "axios";
import { ArrowLeft, Calendar, Car, IndianRupee, Loader2, MapPin, Navigation } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type PartnerBooking = {
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
  user?: {
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

export default function PartnerBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<PartnerBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get("/api/partner/bookings")
      .then((res) => setBookings(res.data.bookings || []))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, []);

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
            <h1 className="text-2xl font-black text-zinc-900">Partner Bookings</h1>
            <p className="text-sm text-zinc-500 mt-1">{bookings.length} rides in your history</p>
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
            <p className="text-sm text-zinc-500 mt-1">Accepted and completed rides will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <button
                key={booking._id}
                onClick={() => router.push("/partner/active-ride")}
                className="w-full text-left bg-white border border-zinc-200 rounded-2xl p-5 hover:border-zinc-400 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center">
                        <Car size={18} />
                      </div>
                      <div>
                        <p className="font-black text-zinc-900">{booking.vehicle?.vehicleModel || "Ride"}</p>
                        <p className="text-xs text-zinc-500">Customer: {booking.user?.name || "User"}</p>
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
          </div>
        )}
      </main>
    </div>
  );
}
