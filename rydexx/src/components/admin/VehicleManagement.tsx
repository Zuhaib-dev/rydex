"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  Truck,
  Car,
  Bike,
  Package,
  Tally3,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  ExternalLink,
  ShieldCheck,
  Ban,
  User,
  Calendar,
  FileText,
  UserCheck,
  FileSearch,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";
import { getOptimizedImageUrl } from "@/lib/imagekit-client";

interface VehicleOwner {
  _id: string;
  name: string;
  email: string;
  mobileNumber?: string;
  partnerStatus: string;
}

interface VehicleDocument {
  _id: string;
  documentType: "rc" | "insurance" | "pollution" | "permit" | "fitness";
  fileUrl: string;
  expiryDate?: string;
  verificationStatus: "pending" | "approved" | "rejected";
  rejectionReason?: string;
}

interface VehicleItem {
  _id: string;
  type: "bike" | "auto" | "car" | "loading" | "truck";
  brand?: string;
  vehicleModel: string;
  vehicleNumber: string;
  color?: string;
  manufacturingYear?: number;
  fuelType?: "petrol" | "diesel" | "cng" | "electric" | "hybrid";
  seatingCapacity?: number;
  imageUrl?: string;
  baseFare?: number;
  perKmRate: number;
  waitingCharge: number;
  status: "approved" | "pending" | "rejected" | "suspended";
  rejectionReason?: string;
  isActive: boolean;
  createdAt: string;
  owner?: VehicleOwner;
  documents?: VehicleDocument[];
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const VEHICLE_TYPE_ICONS = {
  bike: Bike,
  auto: Tally3,
  car: Car,
  loading: Package,
  truck: Truck,
};

const STATUS_CONFIG = {
  approved: {
    bg: "bg-emerald-50 text-emerald-700 border-emerald-100",
    icon: CheckCircle,
    label: "Approved",
  },
  pending: {
    bg: "bg-amber-50 text-amber-700 border-amber-100",
    icon: Clock,
    label: "Pending Review",
  },
  rejected: {
    bg: "bg-rose-50 text-rose-700 border-rose-100",
    icon: XCircle,
    label: "Rejected",
  },
  suspended: {
    bg: "bg-red-50 text-red-700 border-red-100",
    icon: Ban,
    label: "Suspended",
  },
};

const DOC_TYPE_LABELS = {
  rc: "Registration Certificate (RC)",
  insurance: "Insurance Policy",
  pollution: "Pollution Certificate (PUC)",
  permit: "Commercial Permit",
  fitness: "Fitness Certificate",
};

export default function VehicleManagement() {
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [expiryFilter, setExpiryFilter] = useState(""); // 'expiring' or 'expired'
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  
  // Modals & Details
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionType, setActionType] = useState<"approved" | "rejected" | "suspended" | null>(null);
  const [reasonModalOpen, setReasonModalOpen] = useState(false);
  const [actionReason, setActionReason] = useState("");
  const [selectedDocPreview, setSelectedDocPreview] = useState<VehicleDocument | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchVehicles = useCallback(async (
    pageNum = 1, 
    currentSearch = search, 
    currentStatus = status, 
    currentExpiry = expiryFilter
  ) => {
    setRefreshing(true);
    try {
      const url = `/api/admin/vehicles?page=${pageNum}&limit=10&search=${encodeURIComponent(currentSearch)}&status=${currentStatus}&filter=${currentExpiry}`;
      const { data } = await axios.get(url);
      setVehicles(data.vehicles || []);
      setPagination(data.pagination);
      setPage(pageNum);
    } catch (error) {
      console.error("Failed to load vehicle directory:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, status, expiryFilter]);

  useEffect(() => {
    fetchVehicles(1, "", "", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchVehicles(1);
  };

  const handleFilterChange = (newStatus: string, newExpiry: string) => {
    setStatus(newStatus);
    setExpiryFilter(newExpiry);
    fetchVehicles(1, search, newStatus, newExpiry);
  };

  const handleOpenReasonModal = (type: "rejected" | "suspended") => {
    setActionType(type);
    setActionReason("");
    setErrorMsg("");
    setReasonModalOpen(true);
  };

  const handleReviewAction = async (action: "approved" | "rejected" | "suspended", reason = "") => {
    if (!selectedVehicle) return;
    
    if ((action === "rejected" || action === "suspended") && !reason.trim()) {
      setErrorMsg(`A reason is required to set status to ${action}.`);
      return;
    }

    setActionLoading(true);
    setErrorMsg("");
    try {
      await axios.put(`/api/admin/reviews/vehicle/${selectedVehicle._id}`, {
        action,
        reason: action !== "approved" ? reason : "",
      });

      // Update local item status
      setVehicles((prev) =>
        prev.map((v) =>
          v._id === selectedVehicle._id
            ? { ...v, status: action, rejectionReason: action !== "approved" ? reason : "" }
            : v
        )
      );

      // Close modal
      setReasonModalOpen(false);
      
      // Update selected vehicle in state
      setSelectedVehicle((prev) => 
        prev ? { ...prev, status: action, rejectionReason: action !== "approved" ? reason : "" } : null
      );
      
      alert(`Vehicle compliance updated to ${action} successfully.`);
      fetchVehicles(page);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Failed to update vehicle review status.");
    } finally {
      setActionLoading(false);
    }
  };

  const isPdf = (url: string) => {
    return url.toLowerCase().split(/[?#]/)[0].endsWith(".pdf");
  };

  const getExpiryStatus = (expiryDate?: string) => {
    if (!expiryDate) return null;
    const expiry = new Date(expiryDate);
    const now = new Date();
    if (expiry < now) {
      return { label: "Expired", color: "text-red-600 bg-red-50 border-red-100" };
    }
    const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    if (expiry <= thirtyDaysLater) {
      return { label: "Expiring Soon", color: "text-amber-600 bg-amber-50 border-amber-100" };
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <RefreshCw size={24} className="animate-spin text-gray-400" />
        <p className="text-sm font-semibold text-gray-500">Loading vehicle directory...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Vehicle Directory</h2>
          <p className="text-sm text-gray-400">Manage partner fleets, compliance documents, and platform verification</p>
        </div>
        <button
          onClick={() => fetchVehicles(page)}
          disabled={refreshing}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition hover:border-gray-300 hover:text-gray-900 disabled:opacity-50"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by model, brand, or number plate..."
            className="w-full h-11 pl-10 pr-4 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:bg-white transition-all"
          />
          <Search size={16} className="absolute left-3.5 top-3.5 text-gray-400" />
        </form>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={status}
            onChange={(e) => handleFilterChange(e.target.value, expiryFilter)}
            className="h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-600 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
          </select>

          <select
            value={expiryFilter}
            onChange={(e) => handleFilterChange(status, e.target.value)}
            className="h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-600 focus:outline-none"
          >
            <option value="">Document Expiry</option>
            <option value="expiring">Expiring (30 Days)</option>
            <option value="expired">Expired Documents</option>
          </select>
        </div>
      </div>

      {/* Vehicle Directory Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-100/50 bg-white shadow-sm">
        {vehicles.length === 0 ? (
          <div className="p-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 border border-gray-100 text-gray-400 mb-4">
              <Truck size={24} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">No vehicles found</h3>
            <p className="text-sm text-gray-400 mt-1">Try resetting your search query or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/75 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  <th className="px-6 py-4">Vehicle Details</th>
                  <th className="px-6 py-4">Owner Info</th>
                  <th className="px-6 py-4">Compliance Status</th>
                  <th className="px-6 py-4">Documents</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                <AnimatePresence mode="popLayout">
                  {vehicles.map((vehicle) => {
                    const TypeIcon = VEHICLE_TYPE_ICONS[vehicle.type] || Car;
                    const statusConfig = STATUS_CONFIG[vehicle.status];
                    const StatusIcon = statusConfig?.icon || Clock;
                    const docsCount = vehicle.documents?.length || 0;
                    
                    return (
                      <motion.tr
                        key={vehicle._id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gray-50 text-gray-600 flex items-center justify-center border border-gray-200">
                              <TypeIcon size={18} />
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 leading-tight">
                                {vehicle.brand || ""} {vehicle.vehicleModel}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="px-1.5 py-0.5 bg-yellow-100 border border-yellow-200 text-yellow-900 font-mono text-[10px] font-bold tracking-wider rounded uppercase">
                                  {vehicle.vehicleNumber}
                                </span>
                                <span className="text-[10px] text-gray-400 font-semibold uppercase">
                                  {vehicle.type} • {vehicle.fuelType || "N/A"} • {vehicle.seatingCapacity ?? "N/A"} Seats
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          {vehicle.owner ? (
                            <div>
                              <p className="font-bold text-gray-900 flex items-center gap-1">
                                {vehicle.owner.name}
                                <span className={`h-1.5 w-1.5 rounded-full inline-block ${
                                  vehicle.owner.partnerStatus === "approved" ? "bg-green-500" : "bg-amber-500"
                                }`} title={`Driver status: ${vehicle.owner.partnerStatus}`} />
                              </p>
                              <p className="text-xs text-gray-400">{vehicle.owner.email}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5 font-medium">{vehicle.owner.mobileNumber || "No Phone"}</p>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs italic">Unknown Owner</span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${statusConfig?.bg || ""}`}>
                            <StatusIcon size={10} />
                            {statusConfig?.label || vehicle.status}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-gray-700">
                              {docsCount} / 5 Uploaded
                            </span>
                            {/* Visual pill metrics of doc statuses */}
                            <div className="flex gap-1">
                              {["rc", "insurance", "pollution", "permit", "fitness"].map((type) => {
                                const doc = vehicle.documents?.find((d) => d.documentType === type);
                                const isExpiredInfo = doc && getExpiryStatus(doc.expiryDate);
                                return (
                                  <div
                                    key={type}
                                    className={`w-2.5 h-2.5 rounded-full border ${
                                      !doc
                                        ? "bg-gray-100 border-gray-200"
                                        : isExpiredInfo
                                          ? "bg-red-500 border-red-600"
                                          : doc.verificationStatus === "approved"
                                            ? "bg-green-500 border-green-600"
                                            : doc.verificationStatus === "pending"
                                              ? "bg-amber-500 border-amber-600"
                                              : "bg-gray-400 border-gray-500"
                                    }`}
                                    title={`${type.toUpperCase()}: ${
                                      !doc
                                        ? "Missing"
                                        : isExpiredInfo
                                          ? `Expired (${isExpiredInfo.label})`
                                          : doc.verificationStatus
                                    }`}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedVehicle(vehicle);
                                setSelectedDocPreview(vehicle.documents?.[0] || null);
                              }}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-900 hover:bg-gray-50 transition-all shadow-sm"
                              title="Inspect Vehicle Documents & Details"
                            >
                              <Eye size={14} />
                            </button>
                            
                            {vehicle.status === "pending" && (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedVehicle(vehicle);
                                    handleReviewAction("approved");
                                  }}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-green-200 bg-green-50 text-green-600 hover:bg-green-100 transition-all shadow-sm"
                                  title="Approve Vehicle"
                                >
                                  <CheckCircle size={14} />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedVehicle(vehicle);
                                    handleOpenReasonModal("rejected");
                                  }}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all shadow-sm"
                                  title="Reject Vehicle"
                                >
                                  <XCircle size={14} />
                                </button>
                              </>
                            )}

                            {vehicle.status === "approved" && (
                              <button
                                onClick={() => {
                                  setSelectedVehicle(vehicle);
                                  handleOpenReasonModal("suspended");
                                }}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100 transition-all shadow-sm"
                                title="Suspend Vehicle"
                              >
                                <Ban size={14} />
                              </button>
                            )}

                            {vehicle.status === "suspended" && (
                              <button
                                onClick={() => {
                                  setSelectedVehicle(vehicle);
                                  handleReviewAction("approved");
                                }}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-green-200 bg-green-50 text-green-600 hover:bg-green-100 transition-all shadow-sm"
                                title="Reinstate / Approve"
                              >
                                <CheckCircle size={14} />
                              </button>
                            )}
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

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-500">
            Showing Page {page} of {pagination.totalPages} ({pagination.total} total vehicles)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => fetchVehicles(page - 1)}
              disabled={page <= 1 || refreshing}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => fetchVehicles(page + 1)}
              disabled={page >= pagination.totalPages || refreshing}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Detail Inspector Modal */}
      <AnimatePresence>
        {selectedVehicle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setSelectedVehicle(null);
                setSelectedDocPreview(null);
              }}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="relative w-full max-w-5xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-100 overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-4 shrink-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">
                    Vehicle Verification
                  </h3>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                    STATUS_CONFIG[selectedVehicle.status]?.bg || ""
                  }`}>
                    {selectedVehicle.status}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setSelectedVehicle(null);
                    setSelectedDocPreview(null);
                  }}
                  className="text-gray-400 hover:text-black font-semibold text-xs transition-colors"
                >
                  Close
                </button>
              </div>

              {/* Modal Scrollable Content Container */}
              <div className="flex-1 overflow-y-auto py-6 grid grid-cols-1 lg:grid-cols-[1fr_1.35fr] gap-8">
                
                {/* Left Side: Vehicle Info & Driver Specs */}
                <div className="space-y-6">
                  {/* Photo Box */}
                  <div className="border border-gray-200 rounded-2xl overflow-hidden aspect-video bg-gray-50 flex items-center justify-center relative">
                    {selectedVehicle.imageUrl ? (
                      <Image
                        src={getOptimizedImageUrl(selectedVehicle.imageUrl, 600)}
                        alt="Vehicle registration photo"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-gray-400 gap-1.5">
                        <Truck size={36} className="opacity-40" />
                        <span className="text-xs font-semibold">No Vehicle Image Available</span>
                      </div>
                    )}
                  </div>

                  {/* Info Cards */}
                  <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                      <Truck size={12} /> Vehicle Specifications
                    </h4>

                    <div className="grid grid-cols-2 gap-4 text-xs font-medium">
                      <div>
                        <span className="text-gray-400">Make & Model</span>
                        <p className="text-gray-900 font-bold mt-0.5">
                          {selectedVehicle.brand || ""} {selectedVehicle.vehicleModel}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-400">Registration Plate</span>
                        <p className="font-mono text-gray-900 font-bold mt-0.5 uppercase">
                          {selectedVehicle.vehicleNumber}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-400">Manufacture Year</span>
                        <p className="text-gray-900 font-bold mt-0.5">
                          {selectedVehicle.manufacturingYear || "N/A"}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-400">Fuel Type / Seats</span>
                        <p className="text-gray-900 font-bold mt-0.5 uppercase">
                          {selectedVehicle.fuelType || "N/A"} • {selectedVehicle.seatingCapacity ?? "N/A"} Seats
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-400">Base / Per Km Rates</span>
                        <p className="text-gray-900 font-bold mt-0.5">
                          ₹{selectedVehicle.baseFare || 0} base • ₹{selectedVehicle.perKmRate}/km
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-400">Waiting Fees</span>
                        <p className="text-gray-900 font-bold mt-0.5">
                          ₹{selectedVehicle.waitingCharge}/min
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Driver Card */}
                  {selectedVehicle.owner && (
                    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                        <User size={12} /> Driver Owner Information
                      </h4>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-black text-sm">
                          {selectedVehicle.owner.name[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 leading-none">{selectedVehicle.owner.name}</p>
                          <p className="text-xs text-gray-400 truncate mt-1">{selectedVehicle.owner.email}</p>
                          <p className="text-[10px] text-gray-500 font-medium mt-0.5">{selectedVehicle.owner.mobileNumber || "N/A"}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedVehicle.rejectionReason && (
                    <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-xs text-red-800 space-y-1">
                      <p className="font-black uppercase tracking-wider">Compliance Reason</p>
                      <p className="font-medium leading-relaxed">{selectedVehicle.rejectionReason}</p>
                    </div>
                  )}
                </div>

                {/* Right Side: Document Checkbox List & Attachment Live Preview */}
                <div className="flex flex-col gap-6">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
                      Uploaded Documents
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {["rc", "insurance", "pollution", "permit", "fitness"].map((type) => {
                        const doc = selectedVehicle.documents?.find((d) => d.documentType === type);
                        const isExpiredInfo = doc && getExpiryStatus(doc.expiryDate);
                        
                        return (
                          <button
                            key={type}
                            type="button"
                            disabled={!doc}
                            onClick={() => setSelectedDocPreview(doc || null)}
                            className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                              !doc
                                ? "bg-gray-50/50 border-gray-100 text-gray-400 cursor-not-allowed"
                                : selectedDocPreview?.documentType === type
                                  ? "bg-zinc-900 border-zinc-900 text-white shadow-md"
                                  : isExpiredInfo
                                    ? "bg-red-50 border-red-100 text-red-700 hover:bg-red-100/50"
                                    : doc.verificationStatus === "approved"
                                      ? "bg-green-50/50 border-green-100 text-green-700 hover:bg-green-50"
                                      : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            <div className="min-w-0 flex-1 pr-2">
                              <p className="text-xs font-bold truncate leading-tight">
                                {DOC_TYPE_LABELS[type as keyof typeof DOC_TYPE_LABELS]}
                              </p>
                              {doc ? (
                                <p className={`text-[9px] mt-0.5 font-medium leading-none ${
                                  selectedDocPreview?.documentType === type ? "text-white/60" : "text-gray-400"
                                }`}>
                                  {doc.expiryDate
                                    ? `Expires: ${new Date(doc.expiryDate).toLocaleDateString()}`
                                    : "No expiry specified"}
                                </p>
                              ) : (
                                <p className="text-[9px] mt-0.5 leading-none">Not Uploaded</p>
                              )}
                            </div>
                            
                            {doc && (
                              <div className="shrink-0 flex items-center">
                                {isExpiredInfo ? (
                                  <AlertTriangle size={12} className="text-red-500" />
                                ) : doc.verificationStatus === "approved" ? (
                                  <CheckCircle size={12} className={selectedDocPreview?.documentType === type ? "text-green-400" : "text-green-600"} />
                                ) : (
                                  <Clock size={12} className={selectedDocPreview?.documentType === type ? "text-amber-400" : "text-amber-600"} />
                                )}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Attachment Live Preview Screen */}
                  <div className="flex-1 border border-gray-200 rounded-2xl bg-gray-50 flex flex-col overflow-hidden min-h-[300px]">
                    <div className="bg-white border-b border-gray-200 px-4 py-3 shrink-0 flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                        <FileSearch size={14} /> Document Attachment Viewer
                      </span>
                      {selectedDocPreview && (
                        <a
                          href={selectedDocPreview.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-black hover:underline flex items-center gap-1"
                        >
                          Open in Tab <ExternalLink size={12} />
                        </a>
                      )}
                    </div>

                    <div className="flex-1 relative bg-zinc-100 flex items-center justify-center overflow-auto p-4">
                      {selectedDocPreview ? (
                        isPdf(selectedDocPreview.fileUrl) ? (
                          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center gap-3">
                            <FileText size={48} className="text-red-500 animate-bounce" />
                            <div className="space-y-1">
                              <p className="text-sm font-bold text-gray-800">Compliance Document (PDF)</p>
                              <p className="text-xs text-gray-400 max-w-sm">Due to security policy, PDFs must be previewed in a separate window.</p>
                            </div>
                            <a
                              href={selectedDocPreview.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 px-6 py-2.5 bg-black text-white text-xs font-black uppercase tracking-wider rounded-xl hover:scale-102 transition-all shadow"
                            >
                              View PDF Attachment
                            </a>
                          </div>
                        ) : (
                          <div className="relative w-full h-full min-h-[250px]">
                            <Image
                              src={getOptimizedImageUrl(selectedDocPreview.fileUrl, 800)}
                              alt="Document details proof"
                              fill
                              className="object-contain"
                              unoptimized
                            />
                          </div>
                        )
                      ) : (
                        <div className="text-center p-8 text-gray-400 flex flex-col items-center gap-2">
                          <FileText size={32} className="opacity-40" />
                          <p className="text-xs font-semibold">Select a document above to load the attachment preview</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* Action Buttons Footer */}
              <div className="border-t border-gray-100 pt-4 shrink-0 flex flex-col sm:flex-row gap-3">
                {selectedVehicle.status !== "approved" && (
                  <button
                    onClick={() => handleReviewAction("approved")}
                    disabled={actionLoading}
                    className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5"
                  >
                    {actionLoading && actionType === null ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                    Approve Vehicle
                  </button>
                )}

                {selectedVehicle.status !== "rejected" && (
                  <button
                    onClick={() => handleOpenReasonModal("rejected")}
                    disabled={actionLoading}
                    className="flex-1 py-3.5 bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-600 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5"
                  >
                    <XCircle size={14} />
                    Reject Information
                  </button>
                )}

                {selectedVehicle.status === "approved" && (
                  <button
                    onClick={() => handleOpenReasonModal("suspended")}
                    disabled={actionLoading}
                    className="flex-1 py-3.5 bg-amber-50 border border-amber-100 hover:bg-amber-100 text-amber-700 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5"
                  >
                    <Ban size={14} />
                    Suspend Partner
                  </button>
                )}

                <button
                  onClick={() => {
                    setSelectedVehicle(null);
                    setSelectedDocPreview(null);
                  }}
                  className="px-6 py-3.5 border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-black uppercase tracking-widest rounded-xl transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reject / Suspend Reason Description Modal */}
      <AnimatePresence>
        {reasonModalOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setReasonModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white p-6 rounded-3xl max-w-md w-full border border-gray-100 shadow-2xl space-y-4 text-black"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight">
                  {actionType === "suspended" ? "Suspend Vehicle?" : "Reject Vehicle Review?"}
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Specify compliance reasons. The driver will see this feedback in their partner cabinet.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-600 text-xs font-semibold rounded-xl border border-red-100 flex items-center gap-2">
                  <AlertTriangle size={14} />
                  {errorMsg}
                </div>
              )}

              <textarea
                value={actionReason}
                onChange={(e) => {
                  setActionReason(e.target.value);
                  if (errorMsg) setErrorMsg("");
                }}
                placeholder="e.g. Insurance document is expired, RC number plate details mismatch..."
                className="w-full h-24 bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:bg-white transition-all resize-none"
              />

              <div className="flex gap-3">
                <button
                  disabled={actionLoading || !actionReason.trim()}
                  onClick={() => handleReviewAction(actionType!, actionReason)}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  {actionLoading && <RefreshCw size={14} className="animate-spin" />}
                  Confirm {actionType}
                </button>
                <button
                  onClick={() => setReasonModalOpen(false)}
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
  );
}
