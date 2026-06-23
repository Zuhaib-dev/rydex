"use client";

import { PageHead, Panel } from "@/components/partner/shared";
import { CommandSearch } from "@/components/admin/CommandSearch";
import { Plus } from "lucide-react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(res => res.json());



export default function AdminCoupons() {
  const { data, isLoading } = useSWR("/api/admin/coupons?limit=50", fetcher);
  const promos = data?.coupons || [];
  const total = data?.pagination?.total || 0;

  return (
    <div className="space-y-6">
      <PageHead code="ADM / 06" title="Promo Codes" subtitle={`${isLoading ? "..." : total} active codes`} />
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
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Loading codes...</td></tr>
              ) : promos.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No promo codes found.</td></tr>
              ) : promos.map((p: any) => {
                const offStr = p.discountType === "percentage" ? p.discountValue + "%" : "₹" + p.discountValue;
                const expiryStr = new Date(p.expiryDate).toLocaleDateString([], { day: '2-digit', month: 'short' });
                const isExpired = new Date(p.expiryDate) < new Date();
                const statusStr = !p.isActive ? "disabled" : isExpired ? "expired" : "active";
                return (
                <tr key={p._id} className="hover:bg-ink hover:text-bone transition-colors group">
                  <td className="py-2.5 px-2 serif text-[16px] font-black uppercase">{p.code}</td>
                  <td className="py-2.5 px-2 text-signal">{offStr}</td>
                  <td className="py-2.5 px-2">{p.maxDiscount ? "₹" + p.maxDiscount : "—"}</td>
                  <td className="py-2.5 px-2">{p.usedCount}</td>
                  <td className="py-2.5 px-2">{expiryStr}</td>
                  <td className="py-2.5 px-2 text-right">
                    <span className={`mono text-[9px] tracking-[0.22em] px-1.5 py-0.5 ${
                      statusStr !== "active" ? "hairline group-hover:border-bone text-muted-foreground group-hover:text-bone/60" : "bg-signal text-bone"
                    }`}>{statusStr.toUpperCase()}</span>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
