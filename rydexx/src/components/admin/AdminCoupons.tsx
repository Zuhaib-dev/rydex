"use client";

import { useState } from "react";
import { PageHead, Panel } from "@/components/partner/shared";
import { CommandSearch } from "@/components/admin/CommandSearch";
import { Plus, X } from "lucide-react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function AdminCoupons() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const limit = 50;

  let url = `/api/admin/coupons?page=${page}&limit=${limit}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;

  const { data, isLoading, mutate } = useSWR(url, fetcher);
  const promos = data?.coupons || [];
  const total = data?.pagination?.total || 0;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState("flat");
  const [discountValue, setDiscountValue] = useState("");
  const [minBookingAmount, setMinBookingAmount] = useState("");
  const [maxDiscount, setMaxDiscount] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [isActive, setIsActive] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!code || !discountValue || !expiryDate) {
      setError("Code, Discount Value, and Expiry Date are required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          discountType,
          discountValue: Number(discountValue),
          minBookingAmount: minBookingAmount ? Number(minBookingAmount) : undefined,
          maxDiscount: maxDiscount ? Number(maxDiscount) : undefined,
          expiryDate,
          usageLimit: usageLimit ? Number(usageLimit) : undefined,
          isActive
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create coupon");

      setIsModalOpen(false);
      
      // Reset form
      setCode("");
      setDiscountType("flat");
      setDiscountValue("");
      setMinBookingAmount("");
      setMaxDiscount("");
      setExpiryDate("");
      setUsageLimit("");
      setIsActive(true);
      
      mutate();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 relative">
      <PageHead code="ADM / 06" title="Promo Codes" subtitle={`${isLoading ? "..." : total} active codes`} />
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <CommandSearch 
            placeholder="search_promo_code" 
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="brick mono text-[10px] tracking-[0.22em] uppercase px-4 py-3 hover:bg-signal transition-colors cursor-pointer flex items-center gap-2 justify-center"
        >
          <Plus className="h-3.5 w-3.5" /> Mint Code
        </button>
      </div>

      <Panel code="PRO / 06" title="Code Ledger">
        <div className="overflow-x-auto">
          <table className="w-full mono text-[11px] text-left">
            <thead>
              <tr className="hairline-b text-muted-foreground tracking-[0.18em] uppercase text-[9px]">
                <th className="py-3 px-4 font-normal">Code</th>
                <th className="py-3 px-4 font-normal">Off</th>
                <th className="py-3 px-4 font-normal">Cap</th>
                <th className="py-3 px-4 font-normal">Uses</th>
                <th className="py-3 px-4 font-normal">Expiry</th>
                <th className="py-3 px-4 font-normal text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground uppercase tracking-widest text-[10px]">Loading codes...</td></tr>
              ) : promos.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground uppercase tracking-widest text-[10px]">No promo codes found</td></tr>
              ) : promos.map((p: any) => {
                const offStr = p.discountType === "percentage" ? p.discountValue + "%" : "₹" + p.discountValue;
                const expiryStr = new Date(p.expiryDate).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' });
                const isExpired = new Date(p.expiryDate) < new Date();
                const statusStr = !p.isActive ? "disabled" : isExpired ? "expired" : "active";
                return (
                  <tr key={p._id} className="hover:bg-secondary/20 transition-colors group">
                    <td className="py-3 px-4 serif text-[16px] font-black uppercase text-foreground">{p.code}</td>
                    <td className="py-3 px-4 text-signal uppercase tracking-wider text-[10px]">{offStr}</td>
                    <td className="py-3 px-4 text-muted-foreground">{p.maxDiscount ? "₹" + p.maxDiscount : "—"}</td>
                    <td className="py-3 px-4 text-muted-foreground">{p.usedCount}{p.usageLimit ? ` / ${p.usageLimit}` : ""}</td>
                    <td className="py-3 px-4 text-muted-foreground">{expiryStr}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`mono text-[9px] tracking-[0.22em] px-1.5 py-0.5 ${
                        statusStr !== "active" ? "hairline text-muted-foreground" : "bg-signal text-bone"
                      }`}>{statusStr.toUpperCase()}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Brutalist Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card hairline w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-border bg-secondary/10">
              <h2 className="mono text-[12px] uppercase tracking-widest text-foreground font-bold">Create Promo Coupon</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-signal transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Body */}
            <div className="p-6 space-y-5 overflow-y-auto">
              {error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 mono text-[10px] uppercase tracking-wider">{error}</div>}
              
              <div>
                <label className="block mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2">Coupon Code</label>
                <input 
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. WELCOME50"
                  className="w-full bg-background border border-border p-3 mono text-[12px] uppercase focus:outline-none focus:border-signal transition-colors"
                />
              </div>

              <div>
                <label className="block mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2">Discount Type</label>
                <select 
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value)}
                  className="w-full bg-background border border-border p-3 mono text-[12px] focus:outline-none focus:border-signal transition-colors"
                >
                  <option value="flat">Flat Cash Discount (₹)</option>
                  <option value="percentage">Percentage Discount (%)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2">Discount Value</label>
                  <input 
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder="10"
                    className="w-full bg-background border border-border p-3 mono text-[12px] focus:outline-none focus:border-signal transition-colors"
                  />
                </div>
                <div>
                  <label className="block mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2">Expiry Date</label>
                  <input 
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full bg-background border border-border p-3 mono text-[12px] focus:outline-none focus:border-signal transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2">Min Booking Amount (₹)</label>
                  <input 
                    type="number"
                    value={minBookingAmount}
                    onChange={(e) => setMinBookingAmount(e.target.value)}
                    placeholder="e.g. 100 (Optional)"
                    className="w-full bg-background border border-border p-3 mono text-[12px] focus:outline-none focus:border-signal transition-colors"
                  />
                </div>
                <div>
                  <label className="block mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2">Max Discount Cap (₹)</label>
                  <input 
                    type="number"
                    value={maxDiscount}
                    onChange={(e) => setMaxDiscount(e.target.value)}
                    placeholder="e.g. 150 (Optional)"
                    className="w-full bg-background border border-border p-3 mono text-[12px] focus:outline-none focus:border-signal transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2">Total Usage Limit</label>
                <input 
                  type="number"
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(e.target.value)}
                  placeholder="e.g. 500 (Optional)"
                  className="w-full bg-background border border-border p-3 mono text-[12px] focus:outline-none focus:border-signal transition-colors"
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 accent-signal bg-background border border-border"
                />
                <span className="mono text-[11px] tracking-wider uppercase text-muted-foreground">Activate coupon immediately</span>
              </label>

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border bg-secondary/10 flex justify-end gap-3 shrink-0">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2.5 mono text-[11px] tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreate}
                disabled={loading}
                className="brick px-6 py-2.5 mono text-[11px] tracking-[0.2em] uppercase hover:bg-signal transition-colors disabled:opacity-50"
              >
                {loading ? "..." : "Create Coupon"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
