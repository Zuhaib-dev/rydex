"use client";

import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { 
  ArrowLeft, 
  Car, 
  CreditCard, 
  FileText, 
  ShieldCheck, 
  ChevronRight,
  ExternalLink,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle
} from "lucide-react";
import AnimateCard from "@/components/AnimateCard";
import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";

interface PartnerData {
  partner: {
    name: string;
    email: string;
    status: "pending" | "approved" | "rejected";
  };
  vehicle: {
    type: string;
    vehicleModel: string;
    vehicleNumber: string;
  } | null;
  documents: {
    aadharUrl: string;
    rcUrl: string;
    licenseUrl: string;
    status: string;
    rejectionReason?: string;
  } | null;
  bank: {
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
  } | null;
}

function Page() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState<PartnerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchPartner = async () => {
    try {
      const { data } = await axios.get(`/api/admin/reviews/partner/${id}`);
      setData(data);
    } catch (error) {
      console.error("Error fetching partner details:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartner();
  }, [id]);

  const handleAction = async (status: "approved" | "rejected", reason?: string) => {
    setSubmitting(true);
    try {
      await axios.put(`/api/admin/reviews/partner/${id}`, { status, reason });
      await fetchPartner();
      setRejectModal(false);
      setRejectReason("");
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  if (!data) return <div className="p-20 text-center">Partner not found</div>;

  const statusColors = {
    pending: "bg-amber-50 text-amber-600 border-amber-100",
    approved: "bg-green-50 text-green-600 border-green-100",
    rejected: "bg-red-50 text-red-600 border-red-100",
  };

  const StatusBadge = ({ status }: { status: "pending" | "approved" | "rejected" }) => (
    <div className={`px-4 py-1.5 rounded-full text-xs font-bold border ${statusColors[status]} flex items-center gap-1.5 capitalize shadow-sm`}>
      {status === "pending" && <Clock size={14} />}
      {status === "approved" && <CheckCircle2 size={14} />}
      {status === "rejected" && <XCircle size={14} />}
      {status}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      {/* Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => router.back()}
              className="w-12 h-12 rounded-full border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-all text-gray-400 hover:text-black hover:scale-110 active:scale-95"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none uppercase">{data.partner.name}</h1>
              <p className="text-gray-400 text-sm mt-1">{data.partner.email}</p>
            </div>
          </div>
          <StatusBadge status={data.partner.status} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* Left Column: Details & Docs */}
          <div className="lg:col-span-2 space-y-10">
            
            {/* Vehicle Details */}
            <AnimateCard title="Vehicle Details" icon={<Car size={20} />} delay={0.1}>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-gray-400 text-sm font-medium">Vehicle Type</span>
                  <span className="text-gray-900 font-bold bg-gray-50 px-3 py-1 rounded-lg border border-gray-100 uppercase tracking-wider text-xs">
                    {data.vehicle?.type || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-gray-400 text-sm font-medium">Registration Number</span>
                  <span className="text-gray-900 font-black tracking-widest">{data.vehicle?.vehicleNumber || "N/A"}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-400 text-sm font-medium">Model</span>
                  <span className="text-gray-900 font-bold">{data.vehicle?.vehicleModel || "N/A"}</span>
                </div>
              </div>
            </AnimateCard>

            {/* Documents */}
            <AnimateCard title="Documents" icon={<FileText size={20} />} delay={0.2}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: "Aadhaar", url: data.documents?.aadharUrl },
                  { label: "Registration Certificate", url: data.documents?.rcUrl },
                  { label: "Driving License", url: data.documents?.licenseUrl }
                ].map((doc, idx) => (
                  <div key={idx} className="group border border-gray-100 rounded-3xl p-4 bg-gray-50 hover:bg-white hover:shadow-xl hover:shadow-black/5 transition-all">
                    <div className="aspect-video bg-gray-200 rounded-xl mb-4 overflow-hidden relative border border-gray-200">
                        {doc.url ? (
                            <Image src={doc.url} alt={doc.label} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400">No Image</div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white text-[10px] font-black uppercase tracking-widest bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/30">View details</span>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{doc.label}</p>
                        <a 
                            href={doc.url} target="_blank" rel="noreferrer"
                            className="w-full h-10 flex items-center justify-center gap-2 bg-white border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-900 hover:bg-black hover:text-white hover:border-black transition-all"
                        >
                            Open Full Document
                            <ExternalLink size={12} />
                        </a>
                    </div>
                  </div>
                ))}
              </div>
            </AnimateCard>
          </div>

          {/* Right Column: Bank & Actions */}
          <div className="space-y-10">
            
            {/* Bank Details */}
            <AnimateCard title="Bank Details" icon={<CreditCard size={20} />} delay={0.3}>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-gray-400 text-sm font-medium">Account Holder</span>
                  <span className="text-gray-900 font-bold capitalize">{data.bank?.accountHolderName || "N/A"}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-gray-400 text-sm font-medium">Account Number</span>
                  <span className="text-gray-900 font-black">{data.bank?.accountNumber || "N/A"}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-gray-400 text-sm font-medium">IFSC Code</span>
                  <span className="text-gray-900 font-bold uppercase">{data.bank?.ifscCode || "N/A"}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-400 text-sm font-medium">Bank Name</span>
                  <span className="text-gray-900 font-bold">{data.bank?.bankName || "N/A"}</span>
                </div>
              </div>
            </AnimateCard>

            {/* Admin Check Actions */}
            <AnimateCard title="Admin Check" icon={<ShieldCheck size={20} />} delay={0.4} className="border-2 border-gray-900/5 shadow-xl shadow-gray-200">
              <div className="space-y-4">
                <p className="text-gray-400 text-xs font-medium leading-relaxed">Please verify all documents carefully before making a decision.</p>
                
                <button 
                  disabled={submitting || data.partner.status === "approved"}
                  onClick={() => handleAction("approved")}
                  className="w-full h-14 bg-black text-white rounded-2xl flex items-center justify-center gap-2 text-sm font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-2xl shadow-black/10"
                >
                  Approve Application
                  <ChevronRight size={18} />
                </button>

                <button 
                  disabled={submitting || data.partner.status === "rejected"}
                  onClick={() => setRejectModal(true)}
                  className="w-full h-14 bg-white border border-gray-200 text-gray-900 rounded-2xl flex items-center justify-center gap-2 text-sm font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  Reject Application
                </button>
              </div>
            </AnimateCard>
          </div>

        </div>
      </main>

      {/* Reject Reason Modal */}
      <AnimatePresence>
        {rejectModal && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setRejectModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl border border-gray-100"
            >
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-20 h-20 rounded-3xl bg-red-50 text-red-500 flex items-center justify-center border border-red-100">
                  <AlertCircle size={40} strokeWidth={2.5} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Reject Application?</h3>
                  <p className="text-gray-400 text-sm">Please provide a clear reason for rejecting this partner's application.</p>
                </div>
                <textarea 
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Invalid document information, fuzzy images..."
                  className="w-full h-32 bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:bg-white transition-all resize-none"
                />
                <div className="w-full flex flex-col gap-3">
                  <button 
                    disabled={submitting || !rejectReason.trim()}
                    onClick={() => handleAction("rejected", rejectReason)}
                    className="w-full h-14 bg-red-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-600 transition-all disabled:opacity-50 shadow-lg shadow-red-200"
                  >
                    Confirm Rejection
                  </button>
                  <button 
                    onClick={() => setRejectModal(false)}
                    className="w-full h-14 bg-white border border-gray-100 text-gray-400 rounded-2xl text-xs font-black uppercase tracking-widest hover:text-black hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Page;
