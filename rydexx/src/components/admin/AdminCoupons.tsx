"use client";

import { PageHead, Panel } from "@/components/partner/shared";
import { CommandSearch } from "@/components/admin/CommandSearch";
import { Plus } from "lucide-react";

const PROMOS = [
  { code: "BURST24", off: "25%", cap: "₹120", uses: 421, expiry: "30 Jun", status: "active" },
  { code: "NEWRIDE", off: "₹50", cap: "₹50", uses: 1882, expiry: "01 Aug", status: "active" },
  { code: "AIRPORT9", off: "15%", cap: "₹200", uses: 92, expiry: "12 Jul", status: "active" },
  { code: "WINTER20", off: "20%", cap: "₹150", uses: 4421, expiry: "—", status: "expired" },
];

export default function AdminCoupons() {
  return (
    <div className="space-y-6">
      <PageHead code="ADM / 06" title="Promo Codes" subtitle="3 active · 1 expired · ₹2,18,400 redeemed 30D" />
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1"><CommandSearch placeholder="search_promo_code" /></div>
        <button className="brick mono text-[10px] tracking-[0.22em] uppercase px-4 py-3 hover:bg-signal transition-colors cursor-pointer flex items-center gap-2 justify-center">
          <Plus className="h-3.5 w-3.5" /> Mint Code
        </button>
      </div>
      <Panel code="PRO / 06" title="Code Ledger">
        <div className="overflow-x-auto">
          <table className="w-full mono text-[11px]">
            <thead>
              <tr className="hairline-b text-left text-muted-foreground tracking-[0.18em] uppercase text-[9px]">
                <th className="py-2 px-2">Code</th><th className="py-2 px-2">Off</th><th className="py-2 px-2">Cap</th><th className="py-2 px-2">Uses</th><th className="py-2 px-2">Expiry</th><th className="py-2 px-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {PROMOS.map((p) => (
                <tr key={p.code} className="hover:bg-ink hover:text-bone transition-colors group">
                  <td className="py-2.5 px-2 serif text-[16px] font-black">{p.code}</td>
                  <td className="py-2.5 px-2 text-signal">{p.off}</td>
                  <td className="py-2.5 px-2">{p.cap}</td>
                  <td className="py-2.5 px-2">{p.uses}</td>
                  <td className="py-2.5 px-2">{p.expiry}</td>
                  <td className="py-2.5 px-2 text-right">
                    <span className={`mono text-[9px] tracking-[0.22em] px-1.5 py-0.5 ${
                      p.status === "expired" ? "hairline group-hover:border-bone text-muted-foreground group-hover:text-bone/60" : "bg-signal text-bone"
                    }`}>{p.status.toUpperCase()}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
