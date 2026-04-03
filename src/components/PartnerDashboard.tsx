"use client";

import { RootState } from "@/redux/store";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Lock } from "lucide-react";
import Link from "next/link";
import useGetMe from "@/hooks/useGetMe";

function PartnerDashboard() {
  useGetMe(true);
  type step = {
    id: number;
    title: string;
    route?: string;
  };

  const STEPS: step[] = [
    { id: 1, title: "Vehicle", route: "/partner/onboarding/vehicle" },
    { id: 2, title: "Documents", route: "/partner/onboarding/documents" },
    { id: 3, title: "Bank", route: "/partner/onboarding/bank" },
    { id: 4, title: "Review" },
    { id: 5, title: "Video KYC" },
    { id: 6, title: "Pricing" },
    { id: 7, title: "Final Review" },
    { id: 8, title: "Live" },
  ];

  const TOTAL_STEPS = STEPS.length;
  const [completedSteps, setCompletedSteps] = useState(0);
  const { userData } = useSelector((state: RootState) => state.user);

  useEffect(() => {
    if (userData?.partnerOnboardingSteps !== undefined) {
      setCompletedSteps(userData.partnerOnboardingSteps);
    }
  }, [userData]);

  const progressPercentage = (Math.min(completedSteps, TOTAL_STEPS - 1) / (TOTAL_STEPS - 1)) * 100;

  return (
    <div className="min-h-screen bg-gray-50 px-4 pt-28 pb-20">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
            Partner Onboarding
          </h1>
          <p className="text-gray-500 mt-2 text-lg">
            Complete all steps to activate your account
          </p>
        </div>

        {/* Stepper Container */}
        <div className="bg-white rounded-[32px] p-8 sm:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-x-auto">
          <div className="relative min-w-[800px] py-4">
            {/* Background Line */}
            <div className="absolute top-1/2 left-0 w-full h-[2px] bg-gray-100 -translate-y-[22px]" />
            
            {/* Active Progress Line */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 1.2, ease: "circOut" }}
              className="absolute top-1/2 left-0 h-[2px] bg-black -translate-y-[22px] origin-left"
            />

            {/* Steps */}
            <div className="relative flex justify-between">
              {STEPS.map((step) => {
                const isCompleted = step.id <= completedSteps;
                const isActive = step.id === completedSteps + 1;
                const isLocked = step.id > completedSteps + 1;

                return (
                  <div key={step.id} className="flex flex-col items-center">
                    {/* Circle Indicator */}
                    <div className="relative z-10">
                      <motion.div
                        initial={false}
                        animate={{
                          backgroundColor: isCompleted ? "#000" : "#fff",
                          borderColor: isCompleted ? "#000" : isLocked ? "#e5e7eb" : "#000",
                          scale: isActive ? 1.15 : 1,
                        }}
                        className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-colors duration-500 ${
                          isLocked ? "bg-white" : ""
                        }`}
                      >
                        {isCompleted ? (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                          >
                            <Check className="text-white w-6 h-6" />
                          </motion.div>
                        ) : isLocked ? (
                          <Lock className="text-gray-300 w-5 h-5" />
                        ) : (
                          <span className="text-lg font-semibold">{step.id}</span>
                        )}
                      </motion.div>

                      {/* Halo Effect for Active Step */}
                      {isActive && (
                        <motion.div
                          layoutId="halo"
                          className="absolute -inset-2 border-2 border-black/10 rounded-full pointer-events-none"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ 
                            opacity: [0.1, 0.3, 0.1],
                            scale: [1, 1.1, 1],
                          }}
                          transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        />
                      )}
                    </div>

                    {/* Step Label */}
                    <div className="mt-4 text-center">
                      <p
                        className={`text-sm font-semibold transition-colors duration-300 ${
                          isLocked ? "text-gray-400" : "text-black"
                        }`}
                      >
                        {step.title}
                      </p>
                      {isActive && step.route && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-2"
                        >
                          <Link
                            href={step.route}
                            className="text-xs bg-black text-white px-4 py-1.5 rounded-full hover:bg-gray-800 transition-all shadow-md shadow-black/10 active:scale-95"
                          >
                            Continue
                          </Link>
                        </motion.div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="mt-12 bg-black rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl shadow-black/20">
          <div>
            <h3 className="text-xl font-semibold">Verification in Progress</h3>
            <p className="text-gray-400 mt-1 max-w-md">
              Usually, accounts are reviewed within 24 hours after all steps are completed.
              Ensure your documents are clear and valid.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PartnerDashboard;
