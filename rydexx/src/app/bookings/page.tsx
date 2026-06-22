"use client";

import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { ArrowLeft, Loader2, X, ArrowUpRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Nav from "@/components/landing/sections/Nav";
import Ticker from "@/components/landing/sections/Ticker";
import Foot from "@/components/landing/sections/Foot";
import { PageHead, Panel } from "@/components/partner/shared";

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

function formatTicketId(id: string) {
  if (!id) return "BK-UNKNOWN";
  return "BK-" + id.slice(-4).toUpperCase();
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "UNKNOWN";
  
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const day = d.getDate().toString().padStart(2, '0');
  const month = months[d.getMonth()];
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  
  return `${day} ${month} · ${hours}:${minutes}`;
}

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
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Ticker />
      <Nav onAuthRequired={() => {}} />
      
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-5 sm:px-8 py-12 space-y-8">
        <PageHead 
          code="BKG / 01" 
          title="My Bookings" 
          subtitle={`Ledger of dispatched trips · ${total} total tickets`} 
        />

        <Panel code="LOG / 01" title="Booking Ledger">
          <div className="hidden md:block">
            <div className="hairline-b grid grid-cols-[100px_1fr_2fr_80px_100px_120px] gap-3 px-2 py-2 mono text-[9px] tracking-[0.22em] uppercase text-muted-foreground">
              <span>ID</span><span>Date</span><span>Route</span><span>Driver</span><span>Fare</span><span>Status</span>
            </div>
            
            {loading && (
              <div className="p-8 text-center mono text-[11px] tracking-[0.22em] uppercase text-muted-foreground flex items-center justify-center gap-3">
                <Loader2 className="w-3 h-3 animate-spin" /> Loading Ledger...
              </div>
            )}
            
            {!loading && bookings.length === 0 && (
              <div className="p-8 text-center mono text-[11px] tracking-[0.22em] uppercase text-muted-foreground">
                No bookings found on record.
              </div>
            )}
            
            {bookings.map((r, i) => {
              const isActive = ["requested", "awaiting_payment", "confirmed", "arriving", "arrived", "started"].includes(r.status);
              const isCancelled = ["cancelled", "rejected", "expired"].includes(r.status);

              return (
                <motion.button
                  key={r._id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => handleBookingClick(r)}
                  className="w-full text-left hairline-b grid grid-cols-[100px_1fr_2fr_80px_100px_120px] gap-3 px-2 py-3 items-center hover:bg-secondary/30 transition-colors group cursor-pointer"
                >
                  <span className="mono text-[11px] text-signal group-hover:underline flex items-center gap-1">
                    {formatTicketId(r._id)}
                    {isActive && <ArrowUpRight className="w-3 h-3" />}
                  </span>
                  <span className="mono text-[11px]">{formatShortDate(r.createdAt)}</span>
                  <span className="serif text-[15px] truncate pr-4">{r.pickupAddress?.split(',')[0]} → {r.dropAddress?.split(',')[0]}</span>
                  <span className="mono text-[11px] truncate pr-2">{r.driver?.name?.split(' ')[0] || '—'}</span>
                  <span className="mono text-[12px] font-bold">₹{r.fare}</span>
                  <span className={`mono text-[10px] tracking-[0.2em] uppercase ${isActive || r.status === "completed" ? "text-signal" : isCancelled ? "text-muted-foreground line-through" : "text-amber-500"}`}>{r.status.replace("_", " ")}</span>
                </motion.button>
              );
            })}
          </div>

          {/* Mobile View */}
          <div className="md:hidden space-y-3">
            {loading && (
              <div className="p-8 text-center mono text-[11px] tracking-[0.22em] uppercase text-muted-foreground">
                Loading Ledger...
              </div>
            )}
            {bookings.map((r, i) => {
              const isActive = ["requested", "awaiting_payment", "confirmed", "arriving", "arrived", "started"].includes(r.status);
              const isCancelled = ["cancelled", "rejected", "expired"].includes(r.status);

              return (
                <motion.button
                  key={r._id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => handleBookingClick(r)}
                  className="w-full text-left hairline bg-background p-3 space-y-3 hover:bg-secondary/30 transition-colors group"
                >
                   <div className="flex items-center justify-between mono text-[10px] tracking-[0.22em] uppercase">
                     <span className="text-signal flex items-center gap-1 group-hover:underline">
                       {formatTicketId(r._id)}
                       {isActive && <ArrowUpRight className="w-3 h-3" />}
                     </span>
                     <span className={isActive || r.status === "completed" ? "text-signal" : isCancelled ? "text-muted-foreground line-through" : "text-amber-500"}>{r.status.replace("_", " ")}</span>
                   </div>
                   <div className="serif text-[16px] leading-tight">
                     <div>{r.pickupAddress}</div>
                     <div className="text-muted-foreground text-[14px]">↓</div>
                     <div>{r.dropAddress}</div>
                   </div>
                   <div className="hairline-t pt-3 flex items-center justify-between mono text-[10px] tracking-[0.2em] uppercase">
                     <span className="text-muted-foreground">{formatShortDate(r.createdAt)}</span>
                     <span className="font-bold text-[12px] tracking-normal text-foreground">₹{r.fare}</span>
                   </div>
                </motion.button>
              );
            })}
          </div>

          {hasMore && (
            <div className="pt-6 pb-2">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="w-full flex items-center justify-center gap-2 border border-bone/30 bg-background px-4 py-3 hover:bg-signal hover:text-bone hover:border-signal transition-colors mono text-[11px] tracking-[0.2em] uppercase disabled:opacity-50"
              >
                {loadingMore && <Loader2 size={12} className="animate-spin" />}
                {loadingMore ? "LOADING..." : "LOAD OLDER TICKETS"}
              </button>
            </div>
          )}
        </Panel>
      </main>

      <Foot />

      {/* Booking Details Modal */}
      <AnimatePresence>
        {selectedBooking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md"
            onClick={() => setSelectedBooking(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              className="bg-ink border border-bone/30 w-full max-w-md overflow-hidden text-bone"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b border-bone/30 p-4 flex items-center justify-between brick">
                <h3 className="mono text-[10px] tracking-[0.25em] uppercase text-bone/60">TICKET / {formatTicketId(selectedBooking._id)}</h3>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="w-6 h-6 flex items-center justify-center hover:bg-bone/10 transition-colors"
                >
                  <X size={14} className="text-bone/60" />
                </button>
              </div>

              <div className="p-6 space-y-8">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-serif font-black text-2xl tracking-tighter text-bone">{selectedBooking.vehicle?.vehicleModel || "Standard Ride"}</p>
                    <p className="mono text-[10px] tracking-[0.1em] uppercase text-bone/50 mt-1">OPERATOR: {selectedBooking.driver?.name || "UNASSIGNED"}</p>
                  </div>
                  <div className="text-right">
                    <span className={`block mono text-[10px] tracking-[0.2em] uppercase ${selectedBooking.status === "completed" ? "text-signal" : "text-bone/50 line-through"}`}>
                      {selectedBooking.status.replace("_", " ")}
                    </span>
                    <p className="font-serif italic font-bold text-2xl text-bone mt-1">
                      ₹{selectedBooking.fare}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="border border-bone/20 p-3 bg-bone/5">
                    <p className="mono text-[9px] font-bold text-bone/40 uppercase tracking-[0.2em] mb-1.5">SRC / POINT A</p>
                    <p className="font-serif text-lg leading-tight text-bone">{selectedBooking.pickupAddress}</p>
                  </div>
                  <div className="text-center font-mono text-bone/30">↓</div>
                  <div className="border border-bone/20 p-3 bg-bone/5">
                    <p className="mono text-[9px] font-bold text-bone/40 uppercase tracking-[0.2em] mb-1.5">DST / POINT B</p>
                    <p className="font-serif text-lg leading-tight text-bone">{selectedBooking.dropAddress}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-bone/20">
                  <div className="mono text-[9px] tracking-[0.2em] uppercase text-bone/50">
                    LOGGED: {formatShortDate(selectedBooking.createdAt)}
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
