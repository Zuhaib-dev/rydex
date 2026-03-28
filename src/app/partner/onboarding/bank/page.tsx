"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  CheckCircle,
  CreditCard,
  Landmark,
  Phone,
  Building2,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import axios from "axios";

export default function BankPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    accountHolderName: "",
    accountNumber: "",
    ifscCode: "",
    bankName: "",
    mobileNumber: "",
    upi: "",
  });

  const [loading, setLoading] = useState(false);

  const canContinue = 
    formData.accountHolderName.trim() &&
    formData.accountNumber.trim() &&
    formData.ifscCode.trim() &&
    formData.bankName.trim() &&
    formData.mobileNumber.trim() &&
    !loading;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Auto capitalize IFSC
    const formattedValue = name === "ifscCode" ? value.toUpperCase() : value;
    setFormData((prev) => ({ ...prev, [name]: formattedValue }));
  };

  const handleContinue = async () => {
    if (!canContinue) return;
    setLoading(true);
    try {
      const response = await axios.post("/api/partner/onboarding/bank", formData);
      console.log("Bank Save Success:", response.data);
      // Redirect to dashboard or completion interface
      router.push("/");
    } catch (error: any) {
      console.error("Error submitting bank details:", error.response?.data || error);
      alert(error.response?.data?.message || "Failed to save bank details. Please check the information and try again.");
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    {
      label: "Account Holder Name",
      icon: BadgeCheck,
      name: "accountHolderName",
      placeholder: "As per bank records",
      value: formData.accountHolderName
    },
    {
      label: "Bank Name",
      icon: Building2,
      name: "bankName",
      placeholder: "e.g. State Bank of India",
      value: formData.bankName
    },
    {
      label: "Bank Account Number",
      icon: CreditCard,
      name: "accountNumber",
      placeholder: "Enter account number",
      value: formData.accountNumber
    },
    {
      label: "IFSC Code",
      icon: Landmark,
      name: "ifscCode",
      placeholder: "SBI0000001",
      value: formData.ifscCode
    },
    {
      label: "Mobile Number",
      icon: Phone,
      name: "mobileNumber",
      placeholder: "Enter mobile number",
      value: formData.mobileNumber
    },
    {
      label: "UPI ID (optional)",
      icon: Banknote,
      name: "upi",
      placeholder: "Enter UPI ID",
      value: formData.upi
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl bg-white rounded-3xl border border-gray-200 shadow-[0_25px_70px_rgba(0,0,0,0.12)] p-6 sm:p-8"
      >
        {/* Header */}
        <div className="relative text-center">
          <button
            className="absolute left-0 top-0 w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition"
            onClick={() => router.back()}
          >
            <ArrowLeft className="text-gray-500" size={18} />
          </button>

          <p className="text-xs font-semibold text-gray-600">
            Step 3 of 3
          </p>

          <h1 className="text-2xl font-semibold mt-1 text-gray-900">
            Bank & Payout Setup
          </h1>

          <p className="text-sm text-gray-600 mt-2">
            Required for verification
          </p>
        </div>

        {/* Inputs */}
        <div className="mt-8 space-y-6">
          {fields.map((field, i) => {
            const Icon = field.icon;

            return (
              <div key={i}>
                <label
                  htmlFor={field.name}
                  className="text-sm font-medium text-gray-700 relative"
                >
                  {field.label}
                  {field.name !== "upi" && <span className="text-red-500 ml-1">*</span>}
                </label>

                <div className="flex items-center gap-3 mt-2 border-b border-gray-300 focus-within:border-black transition">
                  <Icon size={18} className="text-gray-500" />

                  <input
                    id={field.name}
                    name={field.name}
                    type="text"
                    value={field.value}
                    onChange={handleChange}
                    placeholder={field.placeholder}
                    className="flex-1 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none bg-transparent"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Info */}
        <div className="flex items-start mt-6 gap-3 text-sm text-gray-600">
          <CheckCircle size={16} className="mt-0.5 shrink-0 text-black" />
          <p className="leading-relaxed">
            Bank details are verified before first payout. This usually takes
            24–48 hours.
          </p>
        </div>

        {/* Button */}
        <motion.button
          onClick={handleContinue}
          disabled={!canContinue}
          whileHover={{ scale: canContinue ? 1.02 : 1 }}
          whileTap={{ scale: canContinue ? 0.98 : 1 }}
          className={`w-full py-3 rounded-full mt-6 font-medium flex justify-center items-center gap-2 transition ${
            canContinue 
              ? "bg-black text-white hover:bg-gray-900 shadow-lg shadow-black/20" 
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            "Continue"
          )}
        </motion.button>
      </motion.div>
    </div>
  );
}