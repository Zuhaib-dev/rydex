"use client";

import { PageHead, Panel } from "@/components/partner/shared";


const PAYOUTS = [
  { id: "ST-9921", date: "22 JUN", gross: 1820, fees: 91, net: 1729, status: "Paid" },
  { id: "ST-9920", date: "21 JUN", gross: 2240, fees: 112, net: 2128, status: "Paid" },
  { id: "ST-9919", date: "20 JUN", gross: 980, fees: 49, net: 931, status: "Paid" },
  { id: "ST-9918", date: "19 JUN", gross: 1610, fees: 80, net: 1530, status: "Paid" },
];

export default function Settlements() {
  return (
    <div className="space-y-6">
      <PageHead code="STL / 05" title="Settlements" subtitle="Daily Stripe transfers to bank · IFSC verified" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat k="MTD Gross" v="₹13,317" />
        <Stat k="Fees" v="₹666" />
        <Stat k="Net Paid" v="₹12,651" accent />
      </div>
      <Panel code="WIRE / 01" title="Payout Ledger">
        <div className="hairline-b grid grid-cols-[100px_100px_1fr_1fr_1fr_120px] gap-3 px-2 py-2 mono text-[9px] tracking-[0.22em] uppercase text-muted-foreground">
          <span>ID</span><span>Date</span><span>Gross</span><span>Fees</span><span>Net</span><span>Status</span>
        </div>
        {PAYOUTS.map((p) => (
          <div key={p.id} className="hairline-b grid grid-cols-[100px_100px_1fr_1fr_1fr_120px] gap-3 px-2 py-3 items-center">
            <span className="mono text-[11px] text-signal">{p.id}</span>
            <span className="mono text-[11px]">{p.date}</span>
            <span className="mono text-[12px]">₹{p.gross}</span>
            <span className="mono text-[12px] text-muted-foreground">−₹{p.fees}</span>
            <span className="mono text-[12px] font-bold">₹{p.net}</span>
            <span className="mono text-[10px] tracking-[0.2em] uppercase text-signal">{p.status}</span>
          </div>
        ))}
      </Panel>
    </div>
  );
}

function Stat({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className={`hairline p-5 ${accent ? "brick" : "bg-card"}`}>
      <div className="mono text-[10px] tracking-[0.22em] uppercase opacity-70">{k}</div>
      <div className="serif text-[40px] font-black leading-none tracking-tighter mt-2">{v}</div>
    </div>
  );
}
