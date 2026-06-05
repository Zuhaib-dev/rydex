"use client";

import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getOptimizedImageUrl } from "@/lib/imagekit-client";
import {
  ArrowLeft,
  Car,
  Bike,
  Truck,
  Package,
  Tally3,
  IndianRupee,
  ShieldCheck,
  AlertCircle,
  XCircle,
  Clock,
  Loader2,
  Plus,
  Trash2,
  Upload,
  CheckCircle,
  FileText,
  Calendar,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface VehicleDocument {
  _id: string;
  documentType: "rc" | "insurance" | "pollution" | "permit" | "fitness";
  fileUrl: string;
  expiryDate?: string;
  verificationStatus: "pending" | "approved" | "rejected";
  rejectionReason?: string;
}

interface VehicleData {
  _id: string;
  type: "bike" | "auto" | "car" | "loading" | "truck";
  brand: string;
  vehicleModel: string;
  vehicleNumber: string;
  color: string;
  manufacturingYear: number;
  fuelType: "petrol" | "diesel" | "cng" | "electric" | "hybrid";
  seatingCapacity?: number;
  imageUrl?: string;
  baseFare: number;
  perKmRate: number;
  waitingCharge: number;
  status: "approved" | "pending" | "rejected" | "suspended";
  rejectionReason?: string;
  documents?: VehicleDocument[];
}

const VEHICLE_TYPE_CONFIG = {
  bike: { label: "Bike", icon: Bike, desc: "Two-wheeler delivery & commute" },
  auto: { label: "Auto", icon: Tally3, desc: "Three-wheeler local transit" },
  car: { label: "Car", icon: Car, desc: "Four-wheeler passenger ride" },
  loading: { label: "Loading Vehicle", icon: Package, desc: "Small goods transport" },
  truck: { label: "Truck", icon: Truck, desc: "Heavy commercial cargo" },
};

const STATUS_CONFIG = {
  approved: {
    bg: "bg-emerald-50 border-emerald-100",
    text: "text-emerald-700",
    icon: ShieldCheck,
    label: "Approved",
  },
  pending: {
    bg: "bg-amber-50 border-amber-100",
    text: "text-amber-700",
    icon: Clock,
    label: "Pending Review",
  },
  rejected: {
    bg: "bg-rose-50 border-rose-100",
    text: "text-rose-700",
    icon: XCircle,
    label: "Rejected",
  },
  suspended: {
    bg: "bg-red-50 border-red-100",
    text: "text-red-700",
    icon: AlertCircle,
    label: "Suspended",
  },
};

const DOC_TYPES = [
  { id: "rc", label: "RC Book", desc: "Registration Certificate" },
  { id: "insurance", label: "Insurance Certificate", desc: "Third-party or Comprehensive" },
  { id: "pollution", label: "Pollution (PUC)", desc: "Emission certificate (if applicable)" },
  { id: "permit", label: "Road Permit", desc: "Commercial permit (if applicable)" },
  { id: "fitness", label: "Fitness Certificate", desc: "Commercial fitness proof" },
];

export default function MyGaragePage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<VehicleData[]>([]);
  const [activeVehicleId, setActiveVehicleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Add vehicle modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newType, setNewType] = useState<"bike" | "auto" | "car" | "loading" | "truck">("car");
  const [newBrand, setNewBrand] = useState("");
  const [newModel, setNewModel] = useState("");
  const [newNumber, setNewNumber] = useState("");
  const [newColor, setNewColor] = useState("");
  const [newYear, setNewYear] = useState(new Date().getFullYear());
  const [newFuel, setNewFuel] = useState<"petrol" | "diesel" | "cng" | "electric" | "hybrid">("petrol");
  const [newSeats, setNewSeats] = useState(4);
  const [newImage, setNewImage] = useState<File | null>(null);
  const [newImageUrl, setNewImageUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Document modal
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleData | null>(null);
  const [selectedDocType, setSelectedDocType] = useState("rc");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docExpiry, setDocExpiry] = useState("");
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const docInputRef = useRef<HTMLInputElement>(null);

  const fetchGarage = async () => {
    try {
      const { data } = await axios.get("/api/vehicles");
      setVehicles(data.vehicles || []);
      setActiveVehicleId(data.activeVehicleId || null);
    } catch (err) {
      console.error("Error loading garage details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGarage();
  }, []);

  const handleActivate = async (id: string) => {
    try {
      const { data } = await axios.post(`/api/vehicles/${id}/active`);
      setActiveVehicleId(data.activeVehicleId);
      alert("Vehicle activated successfully.");
      fetchGarage();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to activate vehicle.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this vehicle from your garage?")) return;
    try {
      await axios.delete(`/api/vehicles/${id}`);
      fetchGarage();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to remove vehicle.");
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewImage(file);
    
    // Preview
    const reader = new FileReader();
    reader.onload = () => {
      setNewImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAddVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrand || !newModel || !newNumber || !newColor || !newYear) {
      alert("Please fill all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      let uploadedUrl = "";
      if (newImage) {
        const formData = new FormData();
        formData.append("file", newImage);
        const { data } = await axios.post("/api/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        uploadedUrl = data.url;
      }

      await axios.post("/api/vehicles", {
        type: newType,
        brand: newBrand,
        vehicleModel: newModel,
        vehicleNumber: newNumber,
        color: newColor,
        manufacturingYear: newYear,
        fuelType: newFuel,
        seatingCapacity: newSeats,
        imageUrl: uploadedUrl,
      });

      setAddModalOpen(false);
      resetAddForm();
      fetchGarage();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to add vehicle.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetAddForm = () => {
    setNewBrand("");
    setNewModel("");
    setNewNumber("");
    setNewColor("");
    setNewYear(new Date().getFullYear());
    setNewFuel("petrol");
    setNewSeats(4);
    setNewImage(null);
    setNewImageUrl("");
  };

  const handleDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFile || !selectedVehicle) return;

    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append("file", docFile);
      formData.append("documentType", selectedDocType);
      if (docExpiry) formData.append("expiryDate", docExpiry);

      await axios.post(`/api/vehicles/${selectedVehicle._id}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setDocModalOpen(false);
      setDocFile(null);
      setDocExpiry("");
      fetchGarage();
      alert("Document uploaded successfully.");
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to upload document.");
    } finally {
      setUploadingDoc(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] pb-24">
      {/* Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-zinc-200 z-30">
        <div className="max-w-6xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/")}
              className="w-10 h-10 rounded-xl border border-zinc-200 bg-white flex items-center justify-center hover:bg-zinc-50 transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-xl font-black text-zinc-900 uppercase tracking-tight">My Garage</h1>
              <p className="text-xs text-zinc-500 mt-0.5">Manage multiple vehicles and switch compliance status</p>
            </div>
          </div>
          <button
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-2 bg-black text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md"
          >
            <Plus size={16} />
            <span>Add Vehicle</span>
          </button>
        </div>
      </header>

      {/* Main Garage */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <Loader2 className="animate-spin text-zinc-500" size={32} />
            <p className="text-zinc-500 text-sm font-semibold animate-pulse">Loading garage configuration...</p>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-3xl p-16 text-center max-w-xl mx-auto shadow-sm">
            <Car size={48} className="mx-auto text-zinc-300 mb-4" />
            <h3 className="text-lg font-bold text-zinc-900">Your Garage is Empty</h3>
            <p className="text-zinc-500 text-sm mt-1 mb-6 leading-relaxed">
              Register vehicles to start accepting logistics or cab bookings on Rydex.
            </p>
            <button
              onClick={() => setAddModalOpen(true)}
              className="px-6 py-3 bg-zinc-950 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-zinc-800 transition-colors"
            >
              Add Your First Vehicle
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {vehicles.map((vehicle) => {
              const TypeIcon = VEHICLE_TYPE_CONFIG[vehicle.type]?.icon || Car;
              const statusDetails = STATUS_CONFIG[vehicle.status];
              const StatusIcon = statusDetails ? statusDetails.icon : Clock;
              const isActive = String(activeVehicleId) === String(vehicle._id);

              return (
                <div
                  key={vehicle._id}
                  className={`bg-white border rounded-[32px] overflow-hidden shadow-sm transition-all flex flex-col justify-between ${
                    isActive ? "border-zinc-900 ring-2 ring-zinc-950/5" : "border-zinc-200"
                  }`}
                >
                  <div>
                    {/* Visual Photo Header */}
                    <div className="aspect-[2.1/1] w-full bg-zinc-50 relative border-b border-zinc-100 flex items-center justify-center overflow-hidden">
                      {vehicle.imageUrl ? (
                        <Image
                          src={getOptimizedImageUrl(vehicle.imageUrl, 500)}
                          alt={vehicle.vehicleModel}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="text-center p-6 flex flex-col items-center gap-1 text-zinc-300">
                          <TypeIcon size={40} />
                          <span className="text-[10px] uppercase font-bold">No Photo</span>
                        </div>
                      )}

                      {/* Active Status Badge */}
                      {isActive && (
                        <div className="absolute top-4 left-4 px-3 py-1 bg-black text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg">
                          Active Vehicle
                        </div>
                      )}

                      {/* Verification Badge */}
                      {statusDetails && (
                        <div
                          className={`absolute top-4 right-4 border px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm bg-white ${statusDetails.text} ${statusDetails.bg}`}
                        >
                          <StatusIcon size={10} />
                          {statusDetails.label}
                        </div>
                      )}
                    </div>

                    {/* Specs info */}
                    <div className="p-6 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                            {vehicle.brand}
                          </p>
                          <h3 className="text-xl font-black text-zinc-950 uppercase">{vehicle.vehicleModel}</h3>
                        </div>
                        <div className="font-mono font-black text-zinc-800 border border-zinc-200 px-2 py-1 rounded-lg text-xs bg-zinc-50 tracking-wider">
                          {vehicle.vehicleNumber}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 text-center bg-zinc-50/50 p-3 rounded-2xl border border-zinc-100 text-[11px] font-semibold text-zinc-500">
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Color</p>
                          <p className="text-zinc-800 font-bold capitalize mt-0.5">{vehicle.color}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Year</p>
                          <p className="text-zinc-800 font-bold mt-0.5">{vehicle.manufacturingYear}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Fuel Type</p>
                          <p className="text-zinc-800 font-bold uppercase mt-0.5">{vehicle.fuelType}</p>
                        </div>
                      </div>

                      {/* Rejection/Suspension Reason Alerts */}
                      {["rejected", "suspended"].includes(vehicle.status) && vehicle.rejectionReason && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-[11px] text-red-700 flex items-start gap-2">
                          <AlertCircle size={14} className="shrink-0 mt-0.5" />
                          <p className="font-semibold">{vehicle.rejectionReason}</p>
                        </div>
                      )}

                      {/* Documents Grid */}
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Documents</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {DOC_TYPES.map((type) => {
                            const doc = vehicle.documents?.find((d) => d.documentType === type.id);
                            return (
                              <div
                                key={type.id}
                                className={`p-2.5 rounded-xl border text-left text-xs flex items-center justify-between ${
                                  doc?.verificationStatus === "approved"
                                    ? "bg-green-50/50 border-green-100 text-green-700"
                                    : doc?.verificationStatus === "pending"
                                      ? "bg-amber-50/50 border-amber-100 text-amber-700"
                                      : doc?.verificationStatus === "rejected"
                                        ? "bg-red-50/50 border-red-100 text-red-700"
                                        : "bg-zinc-50 border-zinc-100 text-zinc-400"
                                }`}
                              >
                                <div>
                                  <p className="font-bold">{type.label}</p>
                                  <p className="text-[9px] opacity-70 mt-0.5">
                                    {doc?.expiryDate
                                      ? `Expires: ${new Date(doc.expiryDate).toLocaleDateString()}`
                                      : doc
                                        ? "Uploaded"
                                        : "Missing"}
                                  </p>
                                </div>
                                {doc?.verificationStatus === "approved" ? (
                                  <CheckCircle size={12} className="text-green-600" />
                                ) : doc?.verificationStatus === "pending" ? (
                                  <Clock size={12} className="text-amber-600" />
                                ) : (
                                  <AlertCircle size={12} className="opacity-50" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="p-6 bg-zinc-50/50 border-t border-zinc-100 flex items-center gap-3">
                    {vehicle.status === "approved" && (
                      <button
                        onClick={() => handleActivate(vehicle._id)}
                        disabled={isActive}
                        className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${
                          isActive
                            ? "bg-zinc-100 text-zinc-400 cursor-default"
                            : "bg-zinc-950 text-white hover:bg-zinc-800 active:scale-95"
                        }`}
                      >
                        {isActive ? "Active" : "Set Active"}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelectedVehicle(vehicle);
                        setDocModalOpen(true);
                      }}
                      className="px-4 py-3 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-black uppercase tracking-widest rounded-xl flex items-center gap-1"
                    >
                      <Upload size={14} />
                      Docs
                    </button>
                    <button
                      onClick={() => handleDelete(vehicle._id)}
                      className="p-3 bg-white border border-red-100 hover:bg-red-50 text-red-500 rounded-xl transition-colors"
                      title="Remove Vehicle"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Add Vehicle Modal */}
      <AnimatePresence>
        {addModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAddModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="relative w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-zinc-100 max-h-[85vh] overflow-y-auto"
            >
              <h3 className="text-lg font-black text-zinc-950 uppercase tracking-tight mb-4">Add Vehicle</h3>
              <form onSubmit={handleAddVehicleSubmit} className="space-y-4">
                {/* Type Selection */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-2">
                    Vehicle Type
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {(Object.keys(VEHICLE_TYPE_CONFIG) as Array<keyof typeof VEHICLE_TYPE_CONFIG>).map((typeId) => {
                      const Icon = VEHICLE_TYPE_CONFIG[typeId].icon;
                      return (
                        <button
                          key={typeId}
                          type="button"
                          onClick={() => setNewType(typeId)}
                          className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                            newType === typeId ? "bg-black text-white border-black" : "bg-white border-zinc-200"
                          }`}
                        >
                          <Icon size={18} />
                          <span className="text-[9px] font-bold capitalize">{typeId}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                      Brand / Make
                    </label>
                    <input
                      type="text"
                      required
                      value={newBrand}
                      onChange={(e) => setNewBrand(e.target.value)}
                      placeholder="e.g. Maruti Suzuki"
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                      Model Name
                    </label>
                    <input
                      type="text"
                      required
                      value={newModel}
                      onChange={(e) => setNewModel(e.target.value)}
                      placeholder="e.g. Swift Dzire"
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                      Registration Plate Number
                    </label>
                    <input
                      type="text"
                      required
                      value={newNumber}
                      onChange={(e) => setNewNumber(e.target.value)}
                      placeholder="e.g. MH12AB1234"
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                      Color
                    </label>
                    <input
                      type="text"
                      required
                      value={newColor}
                      onChange={(e) => setNewColor(e.target.value)}
                      placeholder="e.g. White"
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                      Mfg Year
                    </label>
                    <input
                      type="number"
                      required
                      value={newYear}
                      onChange={(e) => setNewYear(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                      Fuel Type
                    </label>
                    <select
                      value={newFuel}
                      onChange={(e: any) => setNewFuel(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm"
                    >
                      <option value="petrol">Petrol</option>
                      <option value="diesel">Diesel</option>
                      <option value="cng">CNG</option>
                      <option value="electric">Electric</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                      Seats
                    </label>
                    <input
                      type="number"
                      value={newSeats}
                      onChange={(e) => setNewSeats(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm"
                    />
                  </div>
                </div>

                {/* Photo Upload */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                    Vehicle Photo
                  </label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    className="hidden"
                    accept="image/*"
                  />
                  {newImageUrl ? (
                    <div className="relative aspect-video w-full border border-zinc-200 rounded-xl overflow-hidden group">
                      <Image src={newImageUrl} alt="Preview" fill className="object-cover" />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute inset-0 bg-black/40 text-white text-xs font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        Change Photo
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full aspect-video border border-dashed border-zinc-300 rounded-xl hover:bg-zinc-50 transition-colors flex flex-col items-center justify-center text-zinc-400 gap-1"
                    >
                      <Upload size={24} />
                      <span className="text-xs font-semibold">Upload Photo</span>
                    </button>
                  )}
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3.5 bg-black hover:bg-zinc-800 disabled:opacity-50 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5"
                  >
                    {submitting && <Loader2 size={16} className="animate-spin" />}
                    Save Vehicle
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddModalOpen(false)}
                    className="px-6 py-3.5 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-black uppercase tracking-widest rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Upload Documents Modal */}
      <AnimatePresence>
        {docModalOpen && selectedVehicle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDocModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-zinc-100"
            >
              <h3 className="text-lg font-black text-zinc-950 uppercase tracking-tight mb-2">Upload Compliance Document</h3>
              <p className="text-xs text-zinc-400 mb-6">
                Upload credentials for <strong className="text-zinc-800">{selectedVehicle.brand} {selectedVehicle.vehicleModel}</strong>.
              </p>

              <form onSubmit={handleDocSubmit} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                    Document Type
                  </label>
                  <select
                    value={selectedDocType}
                    onChange={(e) => setSelectedDocType(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm"
                  >
                    {DOC_TYPES.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.label} ({type.desc})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                    Expiration Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={docExpiry}
                      onChange={(e) => setDocExpiry(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                    File Attachment
                  </label>
                  <input
                    type="file"
                    ref={docInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setDocFile(file);
                    }}
                    className="hidden"
                    accept="image/*,application/pdf"
                  />
                  {docFile ? (
                    <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-zinc-700">
                        <FileText size={16} />
                        <span className="font-bold truncate max-w-[200px]">{docFile.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => docInputRef.current?.click()}
                        className="text-zinc-500 hover:text-black font-black uppercase text-[10px]"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => docInputRef.current?.click()}
                      className="w-full py-6 border border-dashed border-zinc-300 rounded-xl hover:bg-zinc-50 transition-colors flex flex-col items-center justify-center text-zinc-400 gap-1"
                    >
                      <Upload size={20} />
                      <span className="text-xs font-semibold">Select PDF or Image</span>
                    </button>
                  )}
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="submit"
                    disabled={uploadingDoc || !docFile}
                    className="flex-1 py-3.5 bg-black hover:bg-zinc-800 disabled:opacity-50 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5"
                  >
                    {uploadingDoc && <Loader2 size={16} className="animate-spin" />}
                    Upload File
                  </button>
                  <button
                    type="button"
                    onClick={() => setDocModalOpen(false)}
                    className="px-6 py-3.5 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-black uppercase tracking-widest rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
