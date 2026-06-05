"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  Tag, Ticket, Plus, Trash2, ToggleLeft, ToggleRight, Search,
  Calendar, RefreshCw, ChevronLeft, ChevronRight, Info, AlertCircle, X,
  Percent, DollarSign
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CouponItem {
  _id: string;
  code: string;
  discountType: "percentage" | "flat";
  discountValue: number;
  maxDiscount?: number;
  minBookingAmount?: number;
  expiryDate: string;
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
  createdAt: string;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "flat">("flat");
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [maxDiscount, setMaxDiscount] = useState<string>("");
  const [minBookingAmount, setMinBookingAmount] = useState<string>("");
  const [expiryDate, setExpiryDate] = useState("");
  const [usageLimit, setUsageLimit] = useState<string>("");
  const [isActive, setIsActive] = useState(true);

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchCoupons = useCallback(async (pageNum = 1, currentSearch = search) => {
    setRefreshing(true);
    try {
      const url = `/api/admin/coupons?page=${pageNum}&limit=10&search=${encodeURIComponent(currentSearch)}`;
      const { data } = await axios.get(url);
      setCoupons(data.coupons);
      setPagination(data.pagination);
      setPage(pageNum);
    } catch (error) {
      console.error("Failed to load coupons:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => {
    fetchCoupons(1, "");
  }, [fetchCoupons]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCoupons(1);
  };

  const handleToggleActive = async (coupon: CouponItem) => {
    setActionLoadingId(coupon._id);
    const targetState = !coupon.isActive;
    try {
      const { data } = await axios.patch(`/api/admin/coupons/${coupon._id}`, { isActive: targetState });
      setCoupons(prev => prev.map(c => c._id === coupon._id ? { ...c, isActive: data.coupon.isActive } : c));
    } catch (error) {
      console.error("Error toggling coupon active state:", error);
      alert("Failed to update coupon status.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm("Are you sure you want to delete this coupon? This action cannot be undone.")) return;
    setActionLoadingId(id);
    try {
      await axios.delete(`/api/admin/coupons/${id}`);
      setCoupons(prev => prev.filter(c => c._id !== id));
      if (pagination) {
        setPagination({ ...pagination, total: pagination.total - 1 });
      }
    } catch (error) {
      console.error("Error deleting coupon:", error);
      alert("Failed to delete coupon.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    if (!code.trim() || !expiryDate) {
      setFormError("Code and Expiry Date are required.");
      setFormLoading(false);
      return;
    }

    try {
      const payload = {
        code: code.trim().toUpperCase(),
        discountType,
        discountValue,
        maxDiscount: maxDiscount ? parseFloat(maxDiscount) : undefined,
        minBookingAmount: minBookingAmount ? parseFloat(minBookingAmount) : 0,
        expiryDate,
        usageLimit: usageLimit ? parseInt(usageLimit, 10) : undefined,
        isActive,
      };

      await axios.post("/api/admin/coupons", payload);
      
      // Reset Form & Close
      setCode("");
      setDiscountType("flat");
      setDiscountValue(10);
      setMaxDiscount("");
      setMinBookingAmount("");
      setExpiryDate("");
      setUsageLimit("");
      setIsActive(true);
      setIsModalOpen(false);
      
      // Refresh list
      fetchCoupons(1);
    } catch (error: any) {
      console.error("Error creating coupon:", error);
      setFormError(error.response?.data?.message || "Failed to create coupon.");
    } finally {
      setFormLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <RefreshCw size={24} className="animate-spin text-gray-400" />
        <p className="text-sm font-semibold text-gray-500">Loading coupons...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Promo Codes & Coupons</h2>
          <p className="text-sm text-gray-400">Create, monitor, and configure active booking discounts</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchCoupons(page)}
            disabled={refreshing}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition hover:border-gray-300 hover:text-gray-900 disabled:opacity-50"
            title="Refresh list"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 h-10 bg-black text-white px-4 rounded-full text-xs font-black uppercase hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md"
          >
            <Plus size={14} />
            <span>Create Coupon</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search coupons by code..."
            className="w-full h-11 pl-10 pr-4 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:bg-white transition-all uppercase"
          />
          <Search size={16} className="absolute left-3.5 top-3.5 text-gray-400" />
        </form>
      </div>

      {/* Coupons Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-100/50 bg-white shadow-sm">
        {coupons.length === 0 ? (
          <div className="p-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 border border-gray-100 text-gray-400 mb-4">
              <Ticket size={24} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">No coupons found</h3>
            <p className="text-sm text-gray-400 mt-1">Get started by creating your first promotional code.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/75 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  <th className="px-6 py-4">Code</th>
                  <th className="px-6 py-4">Discount</th>
                  <th className="px-6 py-4">Min Spend / Cap</th>
                  <th className="px-6 py-4">Usage</th>
                  <th className="px-6 py-4">Expiry Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                <AnimatePresence mode="popLayout">
                  {coupons.map((coupon) => {
                    const isExpired = new Date(coupon.expiryDate) < new Date();
                    const limitReached = coupon.usageLimit !== undefined && coupon.usedCount >= coupon.usageLimit;
                    return (
                      <motion.tr
                        key={coupon._id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Ticket size={14} className="text-gray-400 shrink-0" />
                            <span className="font-mono font-black text-gray-900 tracking-wider">
                              {coupon.code}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-gray-900">
                            {coupon.discountType === "flat" ? "₹" : ""}
                            {coupon.discountValue}
                            {coupon.discountType === "percentage" ? "% OFF" : " OFF"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs space-y-0.5">
                            <p className="text-gray-500 font-medium">
                              Min. Spend: <span className="font-bold text-gray-700">₹{coupon.minBookingAmount || 0}</span>
                            </p>
                            {coupon.maxDiscount && (
                              <p className="text-gray-500 font-medium">
                                Max Cap: <span className="font-bold text-gray-700">₹{coupon.maxDiscount}</span>
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs">
                            <p className="font-bold text-gray-800">
                              {coupon.usedCount} used
                            </p>
                            <p className="text-gray-400 font-semibold text-[10px] mt-0.5">
                              Limit: {coupon.usageLimit !== undefined ? coupon.usageLimit : "Unlimited"}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`font-semibold ${isExpired ? "text-red-500" : "text-gray-600"}`}>
                            {formatDate(coupon.expiryDate)}
                          </span>
                          {isExpired && (
                            <span className="block text-[9px] font-black uppercase text-red-500 mt-0.5">Expired</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                            isExpired || limitReached
                              ? "bg-red-50 text-red-700 border border-red-150"
                              : coupon.isActive
                              ? "bg-green-50 text-green-700 border border-green-200"
                              : "bg-gray-50 text-gray-500 border border-gray-200"
                          }`}>
                            {isExpired
                              ? "Expired"
                              : limitReached
                              ? "Limit Reached"
                              : coupon.isActive
                              ? "Active"
                              : "Paused"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleActive(coupon)}
                              disabled={actionLoadingId === coupon._id || isExpired || limitReached}
                              className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all ${
                                coupon.isActive
                                  ? "bg-gray-50 border-gray-200 text-gray-500 hover:text-black"
                                  : "bg-green-50 border-green-200 text-green-600 hover:bg-green-100"
                              } disabled:opacity-40`}
                              title={coupon.isActive ? "Pause Coupon" : "Activate Coupon"}
                            >
                              {coupon.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                            </button>
                            <button
                              onClick={() => handleDeleteCoupon(coupon._id)}
                              disabled={actionLoadingId === coupon._id}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-all"
                              title="Delete Coupon"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-500">
            Showing Page {page} of {pagination.totalPages} ({pagination.total} total coupons)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => fetchCoupons(page - 1)}
              disabled={page <= 1 || refreshing}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => fetchCoupons(page + 1)}
              disabled={page >= pagination.totalPages || refreshing}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Create Coupon Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="relative w-full max-w-lg bg-white rounded-3xl p-8 shadow-2xl border border-gray-100 overflow-hidden"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                    <Tag size={18} />
                    <span>Create Promo Coupon</span>
                  </h3>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="text-gray-400 hover:text-black font-semibold text-xs transition"
                  >
                    <X size={16} />
                  </button>
                </div>

                {formError && (
                  <div className="p-4 bg-red-50 border border-red-100 text-red-700 text-xs font-semibold rounded-2xl flex items-center gap-2 animate-shake">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <form onSubmit={handleCreateCoupon} className="space-y-4">
                  {/* Coupon Code */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Coupon Code</label>
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/[^A-Za-z0-9]/g, ""))}
                      placeholder="e.g. WELCOME50"
                      required
                      className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-black/5 focus:bg-white uppercase transition-all"
                    />
                  </div>

                  {/* Type & Value */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Discount Type</label>
                      <select
                        value={discountType}
                        onChange={(e) => setDiscountType(e.target.value as any)}
                        className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 focus:outline-none"
                      >
                        <option value="flat">Flat Cash Discount (₹)</option>
                        <option value="percentage">Percentage discount (%)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Discount Value</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={discountValue}
                          onChange={(e) => setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                          required
                          min={0}
                          className="w-full h-11 pl-9 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-black/5 focus:bg-white transition-all"
                        />
                        <div className="absolute left-3.5 top-3.5 text-gray-400">
                          {discountType === "flat" ? <DollarSign size={13} /> : <Percent size={13} />}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Kashmir / Constraints */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Min Booking Amount (₹)</label>
                      <input
                        type="number"
                        value={minBookingAmount}
                        onChange={(e) => setMinBookingAmount(e.target.value)}
                        placeholder="e.g. 100 (Optional)"
                        min={0}
                        className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:bg-white transition-all"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Max Discount Cap (₹)</label>
                      <input
                        type="number"
                        value={maxDiscount}
                        onChange={(e) => setMaxDiscount(e.target.value)}
                        placeholder="e.g. 150 (Optional)"
                        disabled={discountType === "flat"}
                        className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:bg-white transition-all disabled:opacity-40"
                      />
                    </div>
                  </div>

                  {/* Expiry & Usage limit */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Expiry Date</label>
                      <div className="relative">
                        <input
                          type="date"
                          value={expiryDate}
                          onChange={(e) => setExpiryDate(e.target.value)}
                          required
                          min={new Date().toISOString().split("T")[0]}
                          className="w-full h-11 pl-4 pr-10 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Usage Limit</label>
                      <input
                        type="number"
                        value={usageLimit}
                        onChange={(e) => setUsageLimit(e.target.value)}
                        placeholder="e.g. 500 (Optional)"
                        min={1}
                        className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  {/* Active Switch Toggle */}
                  <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl border border-gray-150">
                    <div className="flex items-center gap-2">
                      <Info size={14} className="text-gray-400" />
                      <span className="text-xs font-bold text-gray-600">Activate coupon immediately</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsActive(!isActive)}
                      className="text-black"
                    >
                      {isActive ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
                    </button>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 h-12 border border-gray-200 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={formLoading}
                      className="flex-1 h-12 bg-black text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition flex items-center justify-center gap-1.5 shadow"
                    >
                      {formLoading ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        "Create Coupon"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
