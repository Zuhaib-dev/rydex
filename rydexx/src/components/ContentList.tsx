"use client";

import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, Video, Check, Loader2 } from "lucide-react";
import Link from "next/link";
import axios from "axios";
import { useState, useEffect } from "react";

type TabType = "partner" | "kyc" | "vehicle";

interface PartnerReview {
  _id: string;
  name: string;
  email: string;
  vehicleType?: string;
}

interface VehicleReview {
  _id: string;
  vehicleModel: string;
  vehicleNumber: string;
  type: string;
  owner?: {
    name: string;
    email: string;
  };
}

interface DashboardData {
  pendingPartnerReviews: PartnerReview[];
  pendingVehicleReviews: VehicleReview[];
  pendingVideoKYC: any[];
}

const EmptyState = () => (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white border border-gray-100 rounded-3xl p-16 flex flex-col items-center justify-center text-center space-y-4 shadow-sm"
    >
      <div className="w-16 h-16 rounded-2xl bg-green-50 text-green-500 flex items-center justify-center border border-green-100 shadow-inner">
        <Check size={32} strokeWidth={3} />
      </div>
      <div className="space-y-1">
        <h3 className="text-xl font-black text-gray-900 tracking-tight">All caught up!</h3>
        <p className="text-gray-400 text-sm font-medium">No pending items right now.</p>
      </div>
    </motion.div>
  );

const ContentList = ({ 
  data, 
  activeTab, 
  refetch 
}: { 
  data: DashboardData; 
  activeTab: TabType; 
  refetch: () => void 
}) => {
  const [kycLoadingId, setKycLoadingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkRejectModal, setBulkRejectModal] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState("");

  // Clear selections when changing tabs
  useEffect(() => {
    setSelectedIds([]);
  }, [activeTab]);

  const initiateKycCall = async (partnerId: string) => {
    setKycLoadingId(partnerId);
    try {
      const res = await axios.post(`/api/admin/video-kyc/start/${partnerId}`);
      const { roomId } = res.data;
      window.location.href = `/video-kyc/${roomId}`;
    } catch (err) {
      console.error("Failed to start KYC call:", err);
      setKycLoadingId(null);
    }
  };

  const handleSelectToggle = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (items: any[]) => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map(item => item._id));
    }
  };

  const handleBulkAction = async (action: "approve" | "reject", reason?: string) => {
    setBulkLoading(true);
    try {
      await axios.post("/api/admin/reviews/bulk", {
        ids: selectedIds,
        type: activeTab === "partner" ? "partner" : "vehicle",
        action,
        reason
      });
      setSelectedIds([]);
      setBulkRejectModal(false);
      setBulkRejectReason("");
      refetch();
    } catch (error) {
      console.error(`Bulk ${action} failed:`, error);
      alert(`Bulk ${action} failed. Please try again.`);
    } finally {
      setBulkLoading(false);
    }
  };

  switch (activeTab) {
    case "partner": {
      const partners = data?.pendingPartnerReviews || [];
      return partners.length > 0 ? (
        <div className="space-y-3 relative pb-20">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50 rounded-xl">
            <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.length === partners.length}
                onChange={() => handleSelectAll(partners)}
                className="rounded border-gray-300 accent-black focus:ring-black"
              />
              Select All Pending Partners ({selectedIds.length}/{partners.length})
            </label>
          </div>

          {partners.map((partner) => (
            <motion.div
              key={partner._id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white p-4 rounded-2xl border border-gray-100/50 shadow-sm flex flex-col gap-4 hover:border-gray-200 transition-all group sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-4">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(partner._id)}
                  onChange={() => handleSelectToggle(partner._id)}
                  className="h-4 w-4 rounded border-gray-300 accent-black focus:ring-black cursor-pointer"
                />
                <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-black text-lg border border-purple-100">
                  {partner.name[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-gray-900 text-base leading-tight">{partner.name}</h4>
                  <p className="truncate text-gray-400 text-xs mt-0.5 tracking-tight">{partner.email}</p>
                </div>
              </div>
              <Link 
                href={`/admin/reviews/partner/${partner._id}`}
                className="flex w-full items-center justify-center gap-2 px-5 py-2.5 bg-black text-white rounded-xl text-xs font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg hover:shadow-black/5 sm:w-auto"
              >
                Review
                <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </motion.div>
          ))}

          {/* Floating Action Bar */}
          <AnimatePresence>
            {selectedIds.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                className="fixed bottom-6 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 flex-col gap-3 rounded-2xl border border-white/10 bg-black px-4 py-4 text-white shadow-2xl sm:w-auto sm:flex-row sm:items-center sm:gap-6 sm:px-6"
              >
                <span className="text-xs font-black uppercase tracking-widest text-gray-400">
                  {selectedIds.length} Selected
                </span>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    disabled={bulkLoading}
                    onClick={() => handleBulkAction("approve")}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-xs font-black uppercase tracking-widest rounded-xl transition-all"
                  >
                    Bulk Approve
                  </button>
                  <button
                    disabled={bulkLoading}
                    onClick={() => setBulkRejectModal(true)}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-xs font-black uppercase tracking-widest rounded-xl transition-all"
                  >
                    Bulk Reject
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bulk Reject Reason Modal */}
          <AnimatePresence>
            {bulkRejectModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white p-6 rounded-3xl max-w-md w-full border border-gray-100 shadow-2xl space-y-4 text-black"
                >
                  <h3 className="text-lg font-black uppercase tracking-tight">Bulk Reject Applications?</h3>
                  <p className="text-xs text-gray-400">Specify rejection reasons for all selected {selectedIds.length} partners.</p>
                  <textarea
                    value={bulkRejectReason}
                    onChange={(e) => setBulkRejectReason(e.target.value)}
                    placeholder="e.g. Incomplete verification, invalid details..."
                    className="w-full h-24 bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:bg-white transition-all resize-none"
                  />
                  <div className="flex gap-3">
                    <button
                      disabled={bulkLoading || !bulkRejectReason.trim()}
                      onClick={() => handleBulkAction("reject", bulkRejectReason)}
                      className="flex-1 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all"
                    >
                      Confirm Reject
                    </button>
                    <button
                      onClick={() => setBulkRejectModal(false)}
                      className="px-4 py-3 border border-gray-200 hover:bg-gray-50 text-xs font-black uppercase tracking-widest rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      ) : <EmptyState />;
    }

    case "vehicle": {
      const vehicles = data?.pendingVehicleReviews || [];
      return vehicles.length > 0 ? (
        <div className="space-y-3 relative pb-20">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50 rounded-xl">
            <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.length === vehicles.length}
                onChange={() => handleSelectAll(vehicles)}
                className="rounded border-gray-300 accent-black focus:ring-black"
              />
              Select All Pending Vehicles ({selectedIds.length}/{vehicles.length})
            </label>
          </div>

          {vehicles.map((vehicle) => (
            <motion.div
              key={vehicle._id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white p-4 rounded-2xl border border-gray-100/50 shadow-sm flex flex-col gap-4 hover:border-gray-200 transition-all group sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-4">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(vehicle._id)}
                  onChange={() => handleSelectToggle(vehicle._id)}
                  className="h-4 w-4 rounded border-gray-300 accent-black focus:ring-black cursor-pointer"
                />
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-lg border border-blue-100">
                  {vehicle.type[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-gray-900 text-base leading-tight">
                    {vehicle.vehicleModel} ({vehicle.vehicleNumber})
                  </h4>
                  <p className="truncate text-gray-400 text-xs mt-0.5 tracking-tight">
                    Owner: {vehicle.owner?.name || "Unknown"}
                  </p>
                </div>
              </div>
              <Link 
                href={`/admin/reviews/vehicle/${vehicle._id}`}
                className="flex w-full items-center justify-center gap-2 px-5 py-2.5 bg-black text-white rounded-xl text-xs font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg hover:shadow-black/5 sm:w-auto"
              >
                Review
                <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </motion.div>
          ))}

          {/* Floating Action Bar */}
          <AnimatePresence>
            {selectedIds.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                className="fixed bottom-6 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 flex-col gap-3 rounded-2xl border border-white/10 bg-black px-4 py-4 text-white shadow-2xl sm:w-auto sm:flex-row sm:items-center sm:gap-6 sm:px-6"
              >
                <span className="text-xs font-black uppercase tracking-widest text-gray-400">
                  {selectedIds.length} Selected
                </span>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    disabled={bulkLoading}
                    onClick={() => handleBulkAction("approve")}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-xs font-black uppercase tracking-widest rounded-xl transition-all"
                  >
                    Bulk Approve
                  </button>
                  <button
                    disabled={bulkLoading}
                    onClick={() => setBulkRejectModal(true)}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-xs font-black uppercase tracking-widest rounded-xl transition-all"
                  >
                    Bulk Reject
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bulk Reject Reason Modal */}
          <AnimatePresence>
            {bulkRejectModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white p-6 rounded-3xl max-w-md w-full border border-gray-100 shadow-2xl space-y-4 text-black"
                >
                  <h3 className="text-lg font-black uppercase tracking-tight">Bulk Reject Vehicles?</h3>
                  <p className="text-xs text-gray-400">Specify rejection reasons for all selected {selectedIds.length} vehicles.</p>
                  <textarea
                    value={bulkRejectReason}
                    onChange={(e) => setBulkRejectReason(e.target.value)}
                    placeholder="e.g. Invalid vehicle document photos, blurred license plate..."
                    className="w-full h-24 bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:bg-white transition-all resize-none"
                  />
                  <div className="flex gap-3">
                    <button
                      disabled={bulkLoading || !bulkRejectReason.trim()}
                      onClick={() => handleBulkAction("reject", bulkRejectReason)}
                      className="flex-1 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all"
                    >
                      Confirm Reject
                    </button>
                    <button
                      onClick={() => setBulkRejectModal(false)}
                      className="px-4 py-3 border border-gray-200 hover:bg-gray-50 text-xs font-black uppercase tracking-widest rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      ) : <EmptyState />;
    }

    case "kyc":
      return data?.pendingVideoKYC && data.pendingVideoKYC.length > 0 ? (
        <div className="space-y-3">
          {data.pendingVideoKYC.map((kyc) => (
            <motion.div
              key={kyc._id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white p-4 rounded-2xl border border-gray-100/50 shadow-sm flex flex-col gap-4 hover:border-gray-200 transition-all group sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black text-lg border border-amber-100">
                  {kyc.name[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-gray-900 text-base leading-tight">{kyc.name}</h4>
                  <p className="text-gray-400 text-xs mt-0.5 tracking-tight">KYC Verification Pending</p>
                </div>
              </div>
              <button 
                onClick={() => initiateKycCall(kyc._id)}
                disabled={kycLoadingId === kyc._id}
                className="flex w-full items-center justify-center gap-2 px-5 py-2.5 bg-black text-white rounded-xl text-xs font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg hover:shadow-black/5 disabled:opacity-70 disabled:cursor-not-allowed sm:w-auto"
              >
                {kycLoadingId === kyc._id ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    Call Now
                    <Video size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </motion.div>
          ))}
        </div>
      ) : <EmptyState />;

    default:
      return <EmptyState />;
  }
}

export default ContentList;
