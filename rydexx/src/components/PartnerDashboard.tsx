"use client";

import { RootState } from "@/redux/store";
import { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "motion/react";
import { Check, Lock, AlertCircle, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StatusCard from "./StatusCard";
import VideoKYCBanner from "./VideoKYCBanner";
import axios from "axios";

function PartnerDashboard() {
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
    { id: 6, title: "Pricing", route: "/partner/onboarding/pricing" },
    { id: 7, title: "Final Review" },
    { id: 8, title: "Live" },
  ];

  const TOTAL_STEPS = STEPS.length;
  const [completedSteps, setCompletedSteps] = useState(0);
  const { userData } = useSelector((state: RootState) => state.user);
  const router = useRouter();

  // Live KYC polling state
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [kycRoomId, setKycRoomId] = useState<string | null>(null);
  const [kycRejectionReason, setKycRejectionReason] = useState<string | null>(null);
  
  // Follow Partner Status too
  const [partnerStatus, setPartnerStatus] = useState<string>("pending");
  const [partnerRejectionReason, setPartnerRejectionReason] = useState<string | undefined>(undefined);

  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (userData?.partnerOnboardingSteps !== undefined) {
      setCompletedSteps(userData.partnerOnboardingSteps);
    }
    // Seed initial KYC state from Redux
    if (userData?.videoKycStatus) {
      setKycStatus(userData.videoKycStatus);
      setKycRoomId(userData.videoKycRoomId ?? null);
      setKycRejectionReason(userData.videoKycRejectionReason ?? null);
    }
    if (userData?.partnerStatus) {
      setPartnerStatus(userData.partnerStatus);
      setPartnerRejectionReason(userData.rejectionReason);
    }
  }, [userData]);

  // Poll /api/user/me every 8s to detect when admin starts a KYC call
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await axios.get("/api/user/me");
        const u = res.data?.user;
        if (u) {
          setKycStatus(u.videoKycStatus);
          setKycRoomId(u.videoKycRoomId ?? null);
          setKycRejectionReason(u.videoKycRejectionReason ?? null);
          setPartnerStatus(u.partnerStatus);
          setPartnerRejectionReason(u.rejectionReason);
          if (u.partnerOnboardingSteps !== undefined) {
             setCompletedSteps(u.partnerOnboardingSteps);
          }
        }
      } catch {
        // silently ignore poll errors
      }
    };

    poll(); // Fetch immediately on mount
    pollRef.current = setInterval(poll, 8000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const progressPercentage =
    (Math.min(completedSteps, TOTAL_STEPS - 1) / (TOTAL_STEPS - 1)) * 100;
  const goToStep = (step: step) => {
    if (step.route && step.id <= completedSteps + 1) {
      router.push(step.route);
    }
  };

  const requestKycRetry = async () => {
    try {
      await axios.post("/api/partner/video-kyc/retry");
      setKycStatus("pending");
      router.refresh();
    } catch (error) {
      console.error("Failed to request KYC retry", error);
    }
  };

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
                        onClick={() => goToStep(step)}
                        initial={false}
                        animate={{
                          backgroundColor: isCompleted ? "#000" : "#fff",
                          borderColor: isCompleted
                            ? "#000"
                            : isLocked
                              ? "#e5e7eb"
                              : "#000",
                          scale: isActive ? 1.15 : 1,
                        }}
                        className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                          isLocked
                            ? "bg-white cursor-not-allowed"
                            : "cursor-pointer hover:shadow-lg hover:shadow-black/5 active:scale-95"
                        }`}
                      >
                        {isCompleted ? (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{
                              type: "spring",
                              stiffness: 300,
                              damping: 20,
                            }}
                          >
                            <Check className="text-white w-6 h-6" />
                          </motion.div>
                        ) : isLocked ? (
                          <Lock className="text-gray-300 w-5 h-5" />
                        ) : (
                          <span className="text-lg font-semibold">
                            {step.id}
                          </span>
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
                            ease: "easeInOut",
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

        {/* Video KYC Banner — shown when admin initiates a call */}
        <AnimatePresence>
          {kycStatus === "in_progress" && kycRoomId && (
            <motion.div
              key="kyc-banner"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="mt-8"
            >
              <VideoKYCBanner
                roomId={kycRoomId}
                partnerName={userData?.name}
              />
            </motion.div>
          )}

          {kycStatus === "rejected" && (
            <motion.div
              key="kyc-rejected"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="mt-8 p-6 bg-red-50 border border-red-100 rounded-4xl"
            >
              <div className="flex flex-col md:flex-row items-start justify-between gap-6">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-500 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertCircle size={28} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-red-900">Video KYC Rejected</h3>
                    <p className="text-red-600 text-xs font-semibold uppercase tracking-wider mt-1">Reason from admin</p>
                    <p className="text-red-700 text-sm mt-1 leading-relaxed">
                      {kycRejectionReason || "Your video verification did not pass the required checks. Please request a new session."}
                    </p>
                  </div>
                </div>
                <button
                  onClick={requestKycRetry}
                  className="w-full md:w-auto shrink-0 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <RefreshCw size={18} />
                  Request New Video KYC
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status Card */}
        {userData && (
          <div className="mt-8">
            <StatusCard
              status={partnerStatus}
              reason={partnerRejectionReason}
              step={completedSteps}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default PartnerDashboard;
