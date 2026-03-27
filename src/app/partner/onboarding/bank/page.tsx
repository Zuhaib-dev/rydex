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
} from "lucide-react";
import { useRouter } from "next/navigation";

function Page() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
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
          {[
            {
              label: "Account Holder Name",
              icon: BadgeCheck,
              id: "ahn",
              placeholder: "As per bank records",
            },
            {
              label: "Bank Account Number",
              icon: CreditCard,
              id: "ban",
              placeholder: "Enter account number",
            },
            {
              label: "IFSC Code",
              icon: Landmark,
              id: "ifsc",
              placeholder: "SBI0000001",
            },
            {
              label: "Mobile Number",
              icon: Phone,
              id: "mn",
              placeholder: "Enter mobile number",
            },
            {
              label: "UPI ID (optional)",
              icon: Banknote,
              id: "upi",
              placeholder: "Enter UPI ID",
            },
          ].map((field, i) => {
            const Icon = field.icon;

            return (
              <div key={i}>
                <label
                  htmlFor={field.id}
                  className="text-sm font-medium text-gray-700"
                >
                  {field.label}
                </label>

                <div className="flex items-center gap-3 mt-2 border-b border-gray-300 focus-within:border-black transition">
                  <Icon size={18} className="text-gray-500" />

                  <input
                    id={field.id}
                    type="text"
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
          <CheckCircle size={16} className="mt-0.5 text-black" />
          <p className="leading-relaxed">
            Bank details are verified before first payout. This usually takes
            24–48 hours.
          </p>
        </div>

        {/* Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full bg-black text-white py-3 rounded-full mt-6 font-medium hover:bg-gray-900 transition"
        >
          Continue
        </motion.button>
      </motion.div>
    </div>
  );
}

export default Page;