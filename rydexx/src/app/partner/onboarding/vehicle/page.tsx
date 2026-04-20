"use client";

import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import axios from "axios";
import {
  Bike,
  Car,
  Truck,
  Package,
  ArrowLeft,
  ChevronRight,
  Tally3,
  Loader2,
} from "lucide-react";

const VEHICLE_TYPES = [
  { id: "bike", label: "Bike", sub: "2 wheeler", icon: Bike },
  { id: "auto", label: "Auto", sub: "3 wheeler ride", icon: Tally3 },
  { id: "car", label: "Car", sub: "4 wheeler ride", icon: Car },
  { id: "loading", label: "Loading", sub: "Small goods", icon: Package },
  { id: "truck", label: "Truck", sub: "Heavy transport", icon: Truck },
];


const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] as const },
});

export default function VehiclePage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [loading, setLoading] = useState(false);

  const canContinue =
    selected && vehicleNumber.trim() && vehicleModel.trim() && !loading;

  const handleContinue = async () => {
    if (!canContinue) return;
    setLoading(true);
    try {
      const response = await axios.post("/api/partner/onboarding/vehicle", {
        vehicleType: selected,
        vehicleModel,
        vehicleNumber,
      });
      console.log("Vehicle Save Success:", response.data);
      router.push("/partner/onboarding/documents");
    } catch (error: any) {
      console.error(
        "Error submitting vehicle details:",
        error.response?.data || error,
      );
      alert(
        error.response?.data?.message ||
          "Failed to save vehicle details. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchVehicleData = async () => {
      try {
        const { data } = await axios.get("/api/partner/onboarding/vehicle");
        if (data?.vehicle) {
          setVehicleNumber(data.vehicle.vehicleNumber || "");
          setVehicleModel(data.vehicle.vehicleModel || "");
          setSelected(data.vehicle.type || null);
        }
      } catch (error: any) {
        if (error.status !== 404) {
          console.error("Error fetching vehicle data:", error);
        }
      }
    };
    fetchVehicleData();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-start py-10 px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] as const }}
        className="w-full max-w-lg bg-white rounded-3xl shadow-sm border border-zinc-100 overflow-hidden"
      >
        {/* Header */}
        <div className="relative flex flex-col items-center pt-8 pb-5 px-6 border-b border-zinc-100">
          <button
            onClick={() => router.back()}
            className="absolute left-5 top-7 w-9 h-9 rounded-full border border-zinc-200 flex items-center justify-center text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            <ArrowLeft size={16} strokeWidth={2} />
          </button>
          <motion.p
            {...fadeUp(0.05)}
            className="text-xs text-zinc-400 font-medium mb-1"
          >
            step 1 of 3
          </motion.p>
          <motion.h1
            {...fadeUp(0.1)}
            className="text-2xl font-black text-zinc-900 tracking-tight"
          >
            Vehicle Details
          </motion.h1>
          <motion.p {...fadeUp(0.15)} className="text-sm text-zinc-400 mt-1">
            Add your vehicle information
          </motion.p>
        </div>

        <div className="px-6 py-7 space-y-8">
          {/* Vehicle Type */}
          <motion.div {...fadeUp(0.18)}>
            <p className="text-sm font-semibold text-zinc-700 mb-4">
              Vehicle Type
            </p>
            <div className="grid grid-cols-3 gap-3">
              {VEHICLE_TYPES.map((v, i) => {
                const Icon = v.icon;
                const isActive = selected === v.id;
                return (
                  <motion.button
                    key={v.id}
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      delay: 0.2 + i * 0.06,
                      duration: 0.35,
                      ease: [0.22, 1, 0.36, 1] as const,
                    }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setSelected(v.id)}
                    className={`relative flex flex-col items-center gap-3 rounded-[22px] border p-4 transition-all duration-300 cursor-pointer overflow-hidden ${
                      isActive
                        ? "border-zinc-900 bg-zinc-900 shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
                        : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50 hover:shadow-sm"
                    }`}
                  >
                    <motion.div
                      animate={{
                        backgroundColor: isActive ? "#ffffff" : "#09090b",
                        color: isActive ? "#09090b" : "#ffffff",
                      }}
                      className="w-[52px] h-[52px] rounded-full flex items-center justify-center shadow-sm"
                    >
                      <Icon size={24} strokeWidth={1.75} />
                    </motion.div>

                    <div className="text-center w-full z-10">
                      <p
                        className={`text-[15px] font-bold tracking-tight transition-colors duration-300 ${isActive ? "text-white" : "text-zinc-900"}`}
                      >
                        {v.label}
                      </p>
                      <p
                        className={`text-[11px] mt-0.5 font-medium transition-colors duration-300 ${isActive ? "text-zinc-400" : "text-zinc-500"}`}
                      >
                        {v.sub}
                      </p>
                    </div>

                    {isActive && (
                      <motion.div
                        layoutId="active-bg"
                        className="absolute inset-0 bg-zinc-900 z-0"
                        initial={false}
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 30,
                        }}
                      />
                    )}
                    {/* Render content above the absolute bg */}
                    <div className="absolute inset-0 flex flex-col items-center gap-3 p-4 z-10">
                      <motion.div
                        animate={{
                          backgroundColor: isActive ? "#ffffff" : "#09090b",
                          color: isActive ? "#09090b" : "#ffffff",
                        }}
                        className="w-[52px] h-[52px] rounded-full flex items-center justify-center shadow-sm"
                      >
                        <Icon size={24} strokeWidth={1.75} />
                      </motion.div>

                      <div className="text-center w-full">
                        <p
                          className={`text-[15px] font-bold tracking-tight transition-colors duration-300 ${isActive ? "text-white" : "text-zinc-900"}`}
                        >
                          {v.label}
                        </p>
                        <p
                          className={`text-[11px] mt-0.5 font-medium transition-colors duration-300 ${isActive ? "text-zinc-400" : "text-zinc-500"}`}
                        >
                          {v.sub}
                        </p>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          {/* Vehicle Number */}
          <motion.div {...fadeUp(0.3)}>
            <label className="text-[13px] font-bold text-zinc-800 tracking-wide uppercase block mb-1">
              Vehicle Number
            </label>
            <input
              type="text"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
              placeholder="e.g. MH12 AB 1234"
              className="w-full border-b-2 border-zinc-200 focus:border-zinc-900 outline-none py-3 text-lg font-bold text-zinc-900 placeholder:text-zinc-300 placeholder:font-medium transition-colors bg-transparent tracking-[0.15em] uppercase"
            />
          </motion.div>

          {/* Vehicle Model */}
          <motion.div {...fadeUp(0.36)}>
            <label className="text-[13px] font-bold text-zinc-800 tracking-wide uppercase block mb-1">
              Vehicle Model
            </label>
            <input
              type="text"
              value={vehicleModel}
              onChange={(e) => setVehicleModel(e.target.value)}
              placeholder="e.g. Tata Ace Gold"
              className="w-full border-b-2 border-zinc-200 focus:border-zinc-900 outline-none py-3 text-base font-semibold text-zinc-900 placeholder:text-zinc-300 placeholder:font-medium transition-colors bg-transparent"
            />
          </motion.div>
        </div>

        {/* Continue button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42, duration: 0.35 }}
          className="px-6 pb-8"
        >
          <motion.button
            onClick={handleContinue}
            whileTap={{ scale: 0.98 }}
            disabled={!canContinue}
            className={`w-full py-4 rounded-2xl text-sm font-bold tracking-wide flex items-center justify-center gap-2 transition-all duration-200 ${
              canContinue
                ? "bg-zinc-900 text-white shadow-lg shadow-zinc-900/20 hover:bg-zinc-800"
                : "bg-zinc-100 text-zinc-300 cursor-not-allowed"
            }`}
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                Continue
                {canContinue && <ChevronRight size={16} strokeWidth={2.5} />}
              </>
            )}
          </motion.button>
        </motion.div>
      </motion.div>
      
    </div>
  );
}
