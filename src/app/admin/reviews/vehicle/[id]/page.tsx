"use client";

import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Truck,
  IndianRupee,
  User,
  Phone,
  Mail,
  Loader2,
  AlertTriangle,
  Image as ImageIcon
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import axios from "axios";
import Image from "next/image";

interface VehicleReviewData {
  _id: string;
  type: string;
  vehicleModel: string;
  vehicleNumber: string;
  imageUrl?: string;
  baseFare: number;
  perKmRate: number;
  waitingCharge: number;
  status: string;
  owner?: {
    _id: string;
    name: string;
    email: string;
    mobileNumber?: string;
  };
}

export default function VehicleReviewPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [data, setData] = useState<VehicleReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchReview = async () => {
      try {
        const res = await axios.get(`/api/admin/reviews/vehicle/${id}`);
        if (res.data?.vehicle) {
          setData(res.data.vehicle);
        }
      } catch (err) {
        console.error("Error fetching vehicle review:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReview();
  }, [id]);

  const handleAction = async (action: "approved" | "rejected") => {
    if (action === "rejected" && !rejectionReason.trim()) {
      setError("Please provide a rejection reason.");
      return;
    }

    setActionLoading(true);
    setError("");
    try {
      await axios.put(`/api/admin/reviews/vehicle/${id}`, {
        action,
        reason: action === "rejected" ? rejectionReason : "",
      });
      router.push("/admin");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to submit review.");
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 space-y-4">
        <AlertTriangle className="text-amber-500" size={48} />
        <p className="text-gray-500 font-medium">Vehicle review not found.</p>
        <button
          onClick={() => router.push("/admin")}
          className="px-6 py-2 bg-black text-white rounded-full font-bold text-sm"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] pb-24">
      {/* Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-100 z-30">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/admin")}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
            >
              <ArrowLeft size={18} className="text-gray-600" />
            </button>
            <h1 className="font-bold text-lg text-gray-900 tracking-tight">Vehicles & Pricing Review</h1>
          </div>
          <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">
            Final Step
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-8 space-y-6">
        {/* Top Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Owner Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm flex flex-col gap-4"
          >
            <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <User size={20} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900 leading-tight">Partner Information</h2>
                <p className="text-xs text-gray-500 mt-0.5">Contact details</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Name</span>
                <span className="text-sm font-semibold text-gray-900">{data.owner?.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 flex items-center gap-1"><Mail size={14} /> Email</span>
                <span className="text-sm font-semibold text-gray-900">{data.owner?.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 flex items-center gap-1"><Phone size={14} /> Mobile</span>
                <span className="text-sm font-semibold text-gray-900">{data.owner?.mobileNumber || "N/A"}</span>
              </div>
            </div>
          </motion.div>

          {/* Vehicle Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm flex flex-col gap-4"
          >
            <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Truck size={20} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900 leading-tight">Vehicle Details</h2>
                <p className="text-xs text-gray-500 mt-0.5">Type & make</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Type</span>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-[10px] font-black uppercase tracking-widest rounded-full">
                  {data.type}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Model</span>
                <span className="text-sm font-semibold text-gray-900">{data.vehicleModel}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Number Plate</span>
                <div className="px-2 py-1 bg-yellow-100 border border-yellow-300 rounded font-mono text-sm font-bold text-yellow-900">
                  {data.vehicleNumber}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Pricing & Image Box */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-[24px] overflow-hidden border border-gray-100 shadow-sm flex flex-col md:flex-row"
        >
          {/* Image Section */}
          <div className="md:w-1/2 p-6 flex flex-col bg-gray-50/50 border-b md:border-b-0 md:border-r border-gray-100">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-4">
              <ImageIcon size={16} />
              Vehicle Photo
            </h2>
            <div className="flex-1 w-full bg-white rounded-2xl border border-gray-200 overflow-hidden relative flex items-center justify-center min-h-[250px]">
              {data.imageUrl ? (
                <Image src={data.imageUrl} alt={data.vehicleModel} fill className="object-contain p-4" unoptimized />
              ) : (
                <div className="flex flex-col items-center justify-center text-gray-400 gap-2">
                  <ImageIcon size={32} className="opacity-50" />
                  <span className="text-sm font-medium">No image provided</span>
                </div>
              )}
            </div>
          </div>

          {/* Pricing Section */}
          <div className="md:w-1/2 p-6 flex flex-col">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-4">
              <IndianRupee size={16} />
              Pricing Config
            </h2>
            
            <div className="space-y-4 flex-1 flex flex-col justify-center">
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Base Fare</p>
                  <p className="text-xs text-gray-400 mt-0.5">Starting charge</p>
                </div>
                <p className="text-xl font-black text-gray-900 flex items-center">
                  <IndianRupee size={18} strokeWidth={3} className="mr-0.5 opacity-50" />{data.baseFare}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Price per KM</p>
                  <p className="text-xs text-gray-400 mt-0.5">Distance fee</p>
                </div>
                <p className="text-xl font-black text-gray-900 flex items-center">
                  <IndianRupee size={18} strokeWidth={3} className="mr-0.5 opacity-50" />{data.perKmRate}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Waiting Charge</p>
                  <p className="text-xs text-gray-400 mt-0.5">Per minute charge</p>
                </div>
                <p className="text-xl font-black text-gray-900 flex items-center">
                  <IndianRupee size={18} strokeWidth={3} className="mr-0.5 opacity-50" />{data.waitingCharge}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 pt-4"
        >
          <button
            onClick={() => setRejectModalOpen(true)}
            className="flex-1 py-4 bg-red-50 hover:bg-red-100 border border-red-100 text-red-600 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <XCircle size={18} />
            Reject Vehicle
          </button>
          <button
            onClick={() => handleAction("approved")}
            disabled={actionLoading}
            className="flex-1 py-4 bg-black hover:bg-gray-900 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-black/10 active:scale-[0.98] disabled:opacity-70"
          >
            {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
            Approve &amp; Activate
          </button>
        </motion.div>
      </main>

      {/* Reject Modal */}
      <AnimatePresence>
        {rejectModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
              onClick={() => setRejectModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-white rounded-[32px] p-6 z-50 shadow-2xl"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-4">
                <AlertTriangle size={24} />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Reject Vehicle & Pricing</h2>
              <p className="text-sm text-gray-500 mb-6">
                Please provide a reason for rejecting this information. The partner will be notified and asked to resubmit.
              </p>

              {error && (
                <div className="p-3 mb-4 rounded-xl bg-red-50 text-red-600 text-xs font-medium border border-red-100 flex items-center gap-2">
                  <AlertTriangle size={14} />
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => {
                      setRejectionReason(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="e.g. Image is blurry, fares are unusually high..."
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-red-400 focus:bg-white transition-colors resize-none h-32"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setRejectModalOpen(false)}
                    className="flex-1 py-3 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleAction("rejected")}
                    disabled={actionLoading}
                    className="flex-1 py-3 text-sm font-bold text-white bg-red-500 rounded-xl hover:bg-red-600 flex items-center justify-center disabled:opacity-70"
                  >
                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : "Confirm Rejection"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
