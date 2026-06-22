"use client";

import { motion } from "framer-motion";
import { ArrowRight, Check, X, MapPin, Clock } from "lucide-react";
import { PageHead, Panel } from "@/components/partner/shared";


const REQUESTS = [
  { id: "RQ-0421", pickup: "Lal Chowk", drop: "Dal Gate", fare: 240, km: 4.2, eta: 3, type: "Sedan" },
  { id: "RQ-0422", pickup: "SXR Airport", drop: "Boulevard Rd", fare: 880, km: 14.6, eta: 9, type: "SUV" },
  { id: "RQ-0423", pickup: "Rajbagh", drop: "Hazratbal", fare: 320, km: 6.8, eta: 5, type: "Sedan" },
  { id: "RQ-0424", pickup: "Nishat", drop: "Pampore", fare: 540, km: 11.2, eta: 7, type: "Auto" },
];

export default function Requests() {
  return (
    <div className="space-y-6">
      <PageHead code="REQ / 01" title="Pending Requests" subtitle="4 dispatch tickets in queue · auto-refresh 8s" />
      <Panel code="QUEUE / 01" title="Inbound · Live">
        {/* Desktop / tablet table */}
        <div className="hidden md:block">
          <div className="hairline-b grid grid-cols-[80px_1fr_1fr_60px_70px_80px_auto] gap-3 px-2 py-2 mono text-[9px] tracking-[0.22em] uppercase text-muted-foreground">
            <span>ID</span><span>Pickup</span><span>Drop</span><span>Km</span><span>ETA</span><span>Fare</span><span className="text-right">Action</span>
          </div>
          {REQUESTS.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="hairline-b grid grid-cols-[80px_1fr_1fr_60px_70px_80px_auto] gap-3 px-2 py-3 items-center hover:bg-secondary/50 transition-colors"
            >
              <span className="mono text-[11px] text-signal">{r.id}</span>
              <span className="serif text-[15px] flex items-center gap-1.5 min-w-0"><MapPin className="h-3 w-3 text-signal shrink-0" /><span className="truncate">{r.pickup}</span></span>
              <span className="serif text-[15px] flex items-center gap-1.5 min-w-0"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{r.drop}</span></span>
              <span className="mono text-[11px]">{r.km}</span>
              <span className="mono text-[11px] flex items-center gap-1"><Clock className="h-3 w-3" />{r.eta}m</span>
              <span className="mono text-[12px] font-bold">₹{r.fare}</span>
              <span className="flex gap-1 justify-end">
                <button className="hairline p-1.5 hover:bg-signal hover:text-bone transition-colors cursor-pointer" aria-label="Accept"><Check className="h-3.5 w-3.5" /></button>
                <button className="hairline p-1.5 hover:bg-ink hover:text-bone transition-colors cursor-pointer" aria-label="Decline"><X className="h-3.5 w-3.5" /></button>
              </span>
            </motion.div>
          ))}
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {REQUESTS.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="hairline bg-background"
            >
              <div className="hairline-b px-3 py-2 flex items-center justify-between mono text-[10px] tracking-[0.22em] uppercase">
                <span className="text-signal">{r.id}</span>
                <span className="text-muted-foreground">{r.type}</span>
              </div>
              <div className="p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <MapPin className="h-3.5 w-3.5 text-signal shrink-0 mt-1" />
                  <div className="min-w-0">
                    <div className="mono text-[9px] tracking-[0.22em] uppercase text-muted-foreground">Pickup</div>
                    <div className="serif text-[16px] leading-tight truncate">{r.pickup}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 mt-1" />
                  <div className="min-w-0">
                    <div className="mono text-[9px] tracking-[0.22em] uppercase text-muted-foreground">Drop</div>
                    <div className="serif text-[16px] leading-tight truncate">{r.drop}</div>
                  </div>
                </div>
                <div className="tick h-1.5" />
                <div className="grid grid-cols-3 gap-2 mono text-[10px] tracking-[0.18em] uppercase">
                  <div>
                    <div className="text-muted-foreground">Km</div>
                    <div className="text-foreground">{r.km}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">ETA</div>
                    <div className="text-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{r.eta}m</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Fare</div>
                    <div className="serif text-[16px] font-black tracking-tighter">₹{r.fare}</div>
                  </div>
                </div>
              </div>
              <div className="hairline-t grid grid-cols-2">
                <button className="brick mono text-[10px] tracking-[0.22em] uppercase py-2.5 hover:bg-signal transition-colors flex items-center justify-center gap-2 cursor-pointer">
                  <Check className="h-3.5 w-3.5" /> Accept
                </button>
                <button className="mono text-[10px] tracking-[0.22em] uppercase py-2.5 hover:bg-secondary transition-colors flex items-center justify-center gap-2 cursor-pointer border-l border-border">
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
