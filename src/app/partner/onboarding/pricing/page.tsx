"use client";

import { motion } from "motion/react";
import { ArrowLeft, IndianRupee, ImagePlus, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import Image from "next/image";

export default function PricingPage() {
  const router = useRouter();

  const [baseFare, setBaseFare] = useState("");
  const [perKmRate, setPerKmRate] = useState("");
  const [waitingCharge, setWaitingCharge] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preload existing pricing data
  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const { data } = await axios.get("/api/partner/onboarding/pricing");
        if (data?.pricing) {
          const p = data.pricing;
          setBaseFare(p.baseFare ? p.baseFare.toString() : "");
          setPerKmRate(p.perKmRate ? p.perKmRate.toString() : "");
          setWaitingCharge(p.waitingCharge ? p.waitingCharge.toString() : "");
          if (p.imageUrl) setImagePreview(p.imageUrl);
        }
      } catch {
        // No prior data — that's fine
      } finally {
        setFetching(false);
      }
    };
    fetchPricing();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    const bf = Number(baseFare);
    const pkm = Number(perKmRate);
    const wc = Number(waitingCharge);
    if (!baseFare || isNaN(bf) || bf <= 0) errs.baseFare = "Enter a valid base fare";
    if (!perKmRate || isNaN(pkm) || pkm <= 0) errs.perKmRate = "Enter a valid price per KM";
    if (!waitingCharge || isNaN(wc) || wc < 0) errs.waitingCharge = "Enter a valid waiting charge";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("baseFare", baseFare);
      fd.append("perKmRate", perKmRate);
      fd.append("waitingCharge", waitingCharge);
      if (imageFile) fd.append("vehicleImage", imageFile);

      await axios.post("/api/partner/onboarding/pricing", fd);
      router.push("/");
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to save pricing. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    {
      key: "baseFare",
      label: "Base Fare",
      placeholder: "base fare",
      value: baseFare,
      setter: setBaseFare,
    },
    {
      key: "perKmRate",
      label: "Price Per KM",
      placeholder: "price per KM",
      value: perKmRate,
      setter: setPerKmRate,
    },
    {
      key: "waitingCharge",
      label: "Waiting Charge",
      placeholder: "Waiting Charge",
      value: waitingCharge,
      setter: setWaitingCharge,
    },
  ];

  if (fetching) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md bg-white rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.12)] overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/partner")}
              className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition shrink-0"
            >
              <ArrowLeft size={15} className="text-gray-500" />
            </button>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">
              Pricing and Vehicle Image
            </h1>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Vehicle Image Upload */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative w-full aspect-[16/9] rounded-2xl border-2 border-dashed border-gray-300 overflow-hidden hover:border-gray-400 transition group bg-gray-50"
            >
              {imagePreview ? (
                <>
                  <Image
                    src={imagePreview}
                    alt="Vehicle"
                    fill
                    className="object-contain"
                    unoptimized
                  />
                  {/* Replace overlay on hover */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <div className="flex items-center gap-2 text-white text-sm font-semibold">
                      <ImagePlus size={18} />
                      Change Image
                    </div>
                  </div>
                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImagePreview(null);
                      setImageFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-red-50 transition z-10"
                  >
                    <X size={14} className="text-gray-600" />
                  </button>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                    <ImagePlus size={22} className="text-gray-400" />
                  </div>
                  <p className="text-sm font-medium">Upload vehicle photo</p>
                  <p className="text-xs text-gray-300">Optional · JPG, PNG</p>
                </div>
              )}
            </button>
          </div>

          {/* Pricing Fields */}
          {fields.map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                {field.label}
              </label>
              <div
                className={`flex items-center border rounded-2xl overflow-hidden transition ${
                  errors[field.key]
                    ? "border-red-400 bg-red-50"
                    : "border-gray-200 bg-white focus-within:border-gray-400"
                }`}
              >
                {/* Rupee prefix box */}
                <div className="px-4 py-3.5 flex items-center justify-center border-r border-gray-200 bg-gray-50">
                  <IndianRupee size={16} className="text-gray-500" />
                </div>
                <input
                  type="number"
                  min="0"
                  value={field.value}
                  onChange={(e) => {
                    field.setter(e.target.value);
                    if (errors[field.key]) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next[field.key];
                        return next;
                      });
                    }
                  }}
                  placeholder={field.placeholder}
                  className="flex-1 px-4 py-3.5 text-sm text-gray-800 placeholder:text-gray-400 outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              {errors[field.key] && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[11px] text-red-500 mt-1 font-medium"
                >
                  {errors[field.key]}
                </motion.p>
              )}
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="px-6 pb-6 pt-2 border-t border-gray-100 flex gap-3 mt-1">
          <button
            onClick={() => router.push("/")}
            className="flex-1 py-3.5 rounded-2xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition active:scale-95"
          >
            Cancel
          </button>
          <motion.button
            onClick={handleSave}
            disabled={loading}
            whileTap={{ scale: 0.97 }}
            className="flex-1 py-3.5 rounded-2xl bg-black text-white font-semibold text-sm hover:bg-gray-900 transition flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : "Save"}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
