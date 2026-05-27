"use client";

import { useEffect, useState } from "react";
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
  HelpCircle,
} from "lucide-react";

interface VehicleData {
  type: "bike" | "auto" | "car" | "loading" | "truck";
  vehicleModel: string;
  vehicleNumber: string;
  imageUrl?: string;
  baseFare: number;
  perKmRate: number;
  waitingCharge: number;
  status: "approved" | "pending" | "rejected";
  rejectionReason?: string;
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
    label: "Approved & Active",
    description: "Your vehicle is verified and ready for bookings.",
  },
  pending: {
    bg: "bg-amber-50 border-amber-100",
    text: "text-amber-700",
    icon: Clock,
    label: "Pending Verification",
    description: "Admin is currently reviewing your documents.",
  },
  rejected: {
    bg: "bg-rose-50 border-rose-100",
    text: "text-rose-700",
    icon: XCircle,
    label: "Rejected / Suspended",
    description: "Verification failed. Review the reason below.",
  },
};

export default function PartnerVehiclePage() {
  const router = useRouter();
  const [vehicle, setVehicle] = useState<VehicleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchVehicle = async () => {
      try {
        const { data } = await axios.get("/api/partner/onboarding/vehicle");
        if (data?.vehicle) {
          setVehicle(data.vehicle);
        } else {
          setError("No registered vehicle details found.");
        }
      } catch (err: any) {
        console.error("Error loading vehicle profile:", err);
        if (err.response?.status === 404) {
          setError("You haven't registered a vehicle yet.");
        } else {
          setError("Failed to load vehicle details. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchVehicle();
  }, []);

  const TypeIcon = vehicle ? (VEHICLE_TYPE_CONFIG[vehicle.type]?.icon || Car) : Car;
  const statusDetails = vehicle ? STATUS_CONFIG[vehicle.status] : null;
  const StatusIcon = statusDetails ? statusDetails.icon : Clock;

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      {/* Sticky Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-zinc-200 z-50">
        <div className="max-w-5xl mx-auto px-4 py-5 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-xl border border-zinc-200 bg-white flex items-center justify-center hover:bg-zinc-50 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-black text-zinc-900 uppercase tracking-tight">Vehicle Profile</h1>
            <p className="text-xs text-zinc-500 mt-0.5">Manage and view your registered vehicle credentials</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <Loader2 className="animate-spin text-zinc-500" size={32} />
            <p className="text-zinc-500 text-sm font-semibold">Loading vehicle details...</p>
          </div>
        ) : error || !vehicle ? (
          <div className="bg-white border border-zinc-200 rounded-3xl p-12 text-center max-w-xl mx-auto shadow-sm">
            <Car size={40} className="mx-auto text-zinc-300 mb-4" />
            <h3 className="text-lg font-bold text-zinc-900">No Vehicle Found</h3>
            <p className="text-zinc-500 text-sm mt-1 mb-6 leading-relaxed">
              {error || "It looks like your vehicle registration process is incomplete."}
            </p>
            <button
              onClick={() => router.push("/partner/onboarding/vehicle")}
              className="px-6 py-3 bg-zinc-950 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-zinc-800 transition-colors"
            >
              Start Onboarding
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Vehicle Card */}
            <div className="lg:col-span-2 space-y-6">
              {/* Main Specifications Card */}
              <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-xs">
                {/* Vehicle Photo Container */}
                <div className="aspect-video w-full bg-zinc-100 relative border-b border-zinc-200 overflow-hidden flex items-center justify-center">
                  {vehicle.imageUrl ? (
                    <Image
                      src={getOptimizedImageUrl(vehicle.imageUrl, 600)}
                      alt={vehicle.vehicleModel}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <div className="text-center p-6 flex flex-col items-center gap-2">
                      <div className="w-16 h-16 rounded-full bg-zinc-50 border border-zinc-200 flex items-center justify-center text-zinc-400">
                        <TypeIcon size={28} />
                      </div>
                      <span className="text-zinc-400 text-xs font-semibold">No Vehicle Photo Uploaded</span>
                    </div>
                  )}
                </div>

                {/* Details Section */}
                <div className="p-6 md:p-8 space-y-6">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Vehicle Model</span>
                    <h2 className="text-2xl font-black text-zinc-900 mt-1 uppercase">{vehicle.vehicleModel}</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Plate Number */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">Plate Number</span>
                      <div className="inline-flex items-center bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-xl font-mono font-black text-zinc-900 uppercase tracking-widest text-sm shadow-sm select-all">
                        {vehicle.vehicleNumber.replace(/(\D+)(\d+)/, "$1-$2")}
                      </div>
                    </div>

                    {/* Vehicle Category */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">Vehicle Category</span>
                      <div className="flex items-center gap-2 text-zinc-900">
                        <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center shrink-0">
                          <TypeIcon size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-bold capitalize leading-none">{VEHICLE_TYPE_CONFIG[vehicle.type]?.label || vehicle.type}</p>
                          <p className="text-[10px] text-zinc-500 mt-0.5">{VEHICLE_TYPE_CONFIG[vehicle.type]?.desc || ""}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Pricing & Verification status */}
            <div className="space-y-8">
              {/* Verification Status Card */}
              {statusDetails && (
                <div className={`border rounded-3xl p-6 shadow-xs ${statusDetails.bg}`}>
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl bg-white border border-black/5 flex items-center justify-center shrink-0 ${statusDetails.text}`}>
                      <StatusIcon size={20} />
                    </div>
                    <div className="space-y-1">
                      <h3 className={`text-sm font-black uppercase tracking-wider ${statusDetails.text}`}>
                        {statusDetails.label}
                      </h3>
                      <p className="text-zinc-500 text-xs leading-relaxed">
                        {statusDetails.description}
                      </p>
                    </div>
                  </div>

                  {/* Rejection Alert Box */}
                  {vehicle.status === "rejected" && vehicle.rejectionReason && (
                    <div className="mt-4 p-4 rounded-2xl bg-white/60 border border-rose-200/50 space-y-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 flex items-center gap-1">
                        <AlertCircle size={12} />
                        Rejection Reason
                      </span>
                      <p className="text-zinc-700 text-xs leading-relaxed font-medium">
                        {vehicle.rejectionReason}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Pricing Cards */}
              <div className="bg-white border border-zinc-200 rounded-3xl p-6 space-y-6 shadow-xs">
                <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
                  <h3 className="text-sm font-black uppercase tracking-wider text-zinc-950">Fare Parameters</h3>
                  <HelpCircle size={15} className="text-zinc-300" />
                </div>

                <div className="space-y-4">
                  {/* Base Fare */}
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-zinc-500 text-xs font-semibold">Base Fare</span>
                    <span className="text-zinc-950 font-black text-sm flex items-center gap-0.5">
                      <IndianRupee size={12} />
                      {vehicle.baseFare}
                    </span>
                  </div>

                  {/* Price Per KM */}
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-zinc-500 text-xs font-semibold">Distance Rate</span>
                    <span className="text-zinc-950 font-black text-sm flex items-center gap-0.5">
                      <IndianRupee size={12} />
                      {vehicle.perKmRate}
                      <span className="text-zinc-400 text-[10px] font-bold">/ km</span>
                    </span>
                  </div>

                  {/* Waiting Charge */}
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-zinc-500 text-xs font-semibold">Waiting Charge</span>
                    <span className="text-zinc-950 font-black text-sm flex items-center gap-0.5">
                      <IndianRupee size={12} />
                      {vehicle.waitingCharge}
                      <span className="text-zinc-400 text-[10px] font-bold">/ min</span>
                    </span>
                  </div>
                </div>

                {/* Info Text */}
                <p className="text-[10px] text-zinc-400 leading-relaxed pt-2 border-t border-zinc-50">
                  Fare parameters are determined by vehicle type and are subject to admin review. To request modifications, contact the partner helpdesk.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
