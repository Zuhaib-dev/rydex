"use client";

import { motion } from "framer-motion";
import { PageHead, Panel } from "@/components/partner/shared";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(res => res.json());

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

export default function Bookings() {
  const { data, error } = useSWR("/api/partner/bookings", fetcher);
  const bookings = data?.bookings || [];
  const isLoading = !data && !error;

  return (
    <div className="space-y-6">
      <PageHead code="BKG / 02" title="My Bookings" subtitle={`Ledger of dispatched trips · ${data?.pagination?.total || 0} total tickets`} />
      <Panel code="LOG / 02" title="Booking Ledger">
        <div className="hidden md:block">
          <div className="hairline-b grid grid-cols-[100px_1fr_2fr_80px_100px_120px] gap-3 px-2 py-2 mono text-[9px] tracking-[0.22em] uppercase text-muted-foreground">
            <span>ID</span><span>Date</span><span>Route</span><span>Km</span><span>Fare</span><span>Status</span>
          </div>
          
          {isLoading && (
            <div className="p-8 text-center mono text-[11px] tracking-[0.22em] uppercase text-muted-foreground">
              Loading Ledger...
            </div>
          )}
          
          {!isLoading && bookings.length === 0 && (
            <div className="p-8 text-center mono text-[11px] tracking-[0.22em] uppercase text-muted-foreground">
              No bookings found on record.
            </div>
          )}
          
          {bookings.map((r: any, i: number) => (
            <motion.div
              key={r._id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="hairline-b grid grid-cols-[100px_1fr_2fr_80px_100px_120px] gap-3 px-2 py-3 items-center hover:bg-secondary/30 transition-colors"
            >
              <span className="mono text-[11px] text-signal">{formatTicketId(r._id)}</span>
              <span className="mono text-[11px]">{formatShortDate(r.createdAt)}</span>
              <span className="serif text-[15px] truncate pr-4">{r.pickupAddress?.split(',')[0]} → {r.dropAddress?.split(',')[0]}</span>
              <span className="mono text-[11px]">{r.tripDistanceKm}</span>
              <span className="mono text-[12px] font-bold">₹{r.fare}</span>
              <span className={`mono text-[10px] tracking-[0.2em] uppercase ${r.status === "completed" ? "text-signal" : r.status === "cancelled" ? "text-muted-foreground line-through" : "text-amber-500"}`}>{r.status}</span>
            </motion.div>
          ))}
        </div>
        
        {/* Mobile View */}
        <div className="md:hidden space-y-3">
          {isLoading && (
            <div className="p-8 text-center mono text-[11px] tracking-[0.22em] uppercase text-muted-foreground">
              Loading Ledger...
            </div>
          )}
          {bookings.map((r: any, i: number) => (
            <motion.div
              key={r._id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="hairline bg-background p-3 space-y-3"
            >
               <div className="flex items-center justify-between mono text-[10px] tracking-[0.22em] uppercase">
                 <span className="text-signal">{formatTicketId(r._id)}</span>
                 <span className={r.status === "completed" ? "text-signal" : r.status === "cancelled" ? "text-muted-foreground line-through" : "text-amber-500"}>{r.status}</span>
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
            </motion.div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
