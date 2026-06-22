"use client";

import { motion } from "framer-motion";
import { PageHead, Panel } from "@/components/partner/shared";


const ROWS = [
  { id: "BK-2218", date: "22 JUN · 14:08", route: "Lal Chowk → Dal Gate", km: 4.2, fare: 240, status: "Completed" },
  { id: "BK-2217", date: "22 JUN · 11:42", route: "SXR Airport → Boulevard", km: 14.6, fare: 880, status: "Completed" },
  { id: "BK-2216", date: "21 JUN · 19:30", route: "Rajbagh → Hazratbal", km: 6.8, fare: 320, status: "Cancelled" },
  { id: "BK-2215", date: "21 JUN · 16:14", route: "Nishat → Pampore", km: 11.2, fare: 540, status: "Completed" },
  { id: "BK-2214", date: "21 JUN · 09:02", route: "Sonwar → Sopore", km: 47.1, fare: 1980, status: "Completed" },
];

export default function Bookings() {
  return (
    <div className="space-y-6">
      <PageHead code="BKG / 02" title="My Bookings" subtitle="Ledger of dispatched trips · 30-day window" />
      <Panel code="LOG / 02" title="Booking Ledger">
        <div className="hairline-b grid grid-cols-[100px_1fr_2fr_80px_100px_120px] gap-3 px-2 py-2 mono text-[9px] tracking-[0.22em] uppercase text-muted-foreground">
          <span>ID</span><span>Date</span><span>Route</span><span>Km</span><span>Fare</span><span>Status</span>
        </div>
        {ROWS.map((r, i) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="hairline-b grid grid-cols-[100px_1fr_2fr_80px_100px_120px] gap-3 px-2 py-3 items-center"
          >
            <span className="mono text-[11px] text-signal">{r.id}</span>
            <span className="mono text-[11px]">{r.date}</span>
            <span className="serif text-[15px]">{r.route}</span>
            <span className="mono text-[11px]">{r.km}</span>
            <span className="mono text-[12px] font-bold">₹{r.fare}</span>
            <span className={`mono text-[10px] tracking-[0.2em] uppercase ${r.status === "Completed" ? "text-signal" : "text-muted-foreground line-through"}`}>{r.status}</span>
          </motion.div>
        ))}
      </Panel>
    </div>
  );
}
