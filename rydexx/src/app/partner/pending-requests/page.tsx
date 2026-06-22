"use client";

import { motion } from "framer-motion";
import { ArrowRight, Check, X, MapPin, Clock } from "lucide-react";
import { PageHead, Panel } from "@/components/partner/shared";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useState } from "react";

const fetcher = (url: string) => fetch(url).then(res => res.json());


export default function Requests() {
  const router = useRouter();
  const { data, mutate } = useSWR("/api/partner/bookings/pending", fetcher, { refreshInterval: 8000 });
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const requests = data?.bookings || [];

  const handleAccept = async (id: string) => {
    try {
      setLoadingId(id);
      const res = await fetch(`/api/booking/${id}/accept`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to accept");
      toast.success("Ride accepted!");
      router.push(`/partner/active-ride`);
    } catch (err: any) {
      toast.error(err.message);
      setLoadingId(null);
    }
  };

  const handleDecline = async (id: string) => {
    try {
      setLoadingId(id);
      const res = await fetch(`/api/booking/${id}/reject`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to decline");
      toast.success("Ride declined.");
      mutate(); // Refresh the list
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoadingId(null);
    }
  };


  return (
    <div className="space-y-6">
      <PageHead code="REQ / 01" title="Pending Requests" subtitle={`${requests.length} dispatch tickets in queue · auto-refresh 8s`} />
      <Panel code="QUEUE / 01" title="Inbound · Live">
        {/* Desktop / tablet table */}
        <div className="hidden md:block">
          <div className="hairline-b grid grid-cols-[80px_1fr_1fr_60px_70px_80px_auto] gap-3 px-2 py-2 mono text-[9px] tracking-[0.22em] uppercase text-muted-foreground">
            <span>ID</span><span>Pickup</span><span>Drop</span><span>Km</span><span>ETA</span><span>Fare</span><span className="text-right">Action</span>
          </div>
          {requests.map((r: any, i: number) => (
            <motion.div
              key={r._id?.slice(-6).toUpperCase()}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="hairline-b grid grid-cols-[80px_1fr_1fr_60px_70px_80px_auto] gap-3 px-2 py-3 items-center hover:bg-secondary/50 transition-colors"
            >
              <span className="mono text-[11px] text-signal">{r._id?.slice(-6).toUpperCase()}</span>
              <span className="serif text-[15px] flex items-center gap-1.5 min-w-0"><MapPin className="h-3 w-3 text-signal shrink-0" /><span className="truncate">{r.pickupAddress}</span></span>
              <span className="serif text-[15px] flex items-center gap-1.5 min-w-0"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{r.dropAddress}</span></span>
              <span className="mono text-[11px]">{r.tripDistanceKm}</span>
              <span className="mono text-[11px] flex items-center gap-1"><Clock className="h-3 w-3" />{r.durationMinutes}m</span>
              <span className="mono text-[12px] font-bold">₹{r.fare}</span>
              <span className="flex gap-1 justify-end">
                <button onClick={() => handleAccept(r._id)} disabled={loadingId === r._id} className="hairline p-1.5 hover:bg-signal hover:text-bone transition-colors cursor-pointer disabled:opacity-50" aria-label="Accept"><Check className="h-3.5 w-3.5" /></button>
                <button onClick={() => handleDecline(r._id)} disabled={loadingId === r._id} className="hairline p-1.5 hover:bg-ink hover:text-bone transition-colors cursor-pointer disabled:opacity-50" aria-label="Decline"><X className="h-3.5 w-3.5" /></button>
              </span>
            </motion.div>
          ))}
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {requests.map((r: any, i: number) => (
            <motion.div
              key={r._id?.slice(-6).toUpperCase()}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="hairline bg-background"
            >
              <div className="hairline-b px-3 py-2 flex items-center justify-between mono text-[10px] tracking-[0.22em] uppercase">
                <span className="text-signal">{r._id?.slice(-6).toUpperCase()}</span>
                <span className="text-muted-foreground">{r.vehicleType}</span>
              </div>
              <div className="p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <MapPin className="h-3.5 w-3.5 text-signal shrink-0 mt-1" />
                  <div className="min-w-0">
                    <div className="mono text-[9px] tracking-[0.22em] uppercase text-muted-foreground">Pickup</div>
                    <div className="serif text-[16px] leading-tight truncate">{r.pickupAddress}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 mt-1" />
                  <div className="min-w-0">
                    <div className="mono text-[9px] tracking-[0.22em] uppercase text-muted-foreground">Drop</div>
                    <div className="serif text-[16px] leading-tight truncate">{r.dropAddress}</div>
                  </div>
                </div>
                <div className="tick h-1.5" />
                <div className="grid grid-cols-3 gap-2 mono text-[10px] tracking-[0.18em] uppercase">
                  <div>
                    <div className="text-muted-foreground">Km</div>
                    <div className="text-foreground">{r.tripDistanceKm}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">ETA</div>
                    <div className="text-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{r.durationMinutes}m</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Fare</div>
                    <div className="serif text-[16px] font-black tracking-tighter">₹{r.fare}</div>
                  </div>
                </div>
              </div>
              <div className="hairline-t grid grid-cols-2">
                <button onClick={() => handleAccept(r._id)} disabled={loadingId === r._id} className="brick mono text-[10px] tracking-[0.22em] uppercase py-2.5 hover:bg-signal transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
                  <Check className="h-3.5 w-3.5" /> Accept
                </button>
                <button onClick={() => handleDecline(r._id)} disabled={loadingId === r._id} className="mono text-[10px] tracking-[0.22em] uppercase py-2.5 hover:bg-secondary transition-colors flex items-center justify-center gap-2 cursor-pointer border-l border-border disabled:opacity-50">
                  <X className="h-3.5 w-3.5" /> Decline
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
