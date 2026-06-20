"use client";

import { RootState } from "@/redux/store";
import { useCallback, useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "motion/react";
import { Check, Lock, AlertCircle, RefreshCw, Bike, Car, Truck, Package, Tally3 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StatusCard from "./StatusCard";
import VideoKYCBanner from "./VideoKYCBanner";
import axios from "axios";
import PartnerAnalyticsHub from "./PartnerAnalyticsHub";
import WeatherWidget from "./WeatherWidget";
import { getSocket } from "@/lib/socket";

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
  const [polledCompletedSteps, setPolledCompletedSteps] = useState<number | null>(null);
  const { userData } = useSelector((state: RootState) => state.user);
  const router = useRouter();

  // Live KYC polling state
  const [polledKycStatus, setPolledKycStatus] = useState<string | null>(null);
  const [polledKycRoomId, setPolledKycRoomId] = useState<string | null>(null);
  const [polledKycRejectionReason, setPolledKycRejectionReason] = useState<string | null>(null);
  
  // Follow Partner Status too
  const [polledPartnerStatus, setPolledPartnerStatus] = useState<string | null>(null);
  const [polledPartnerRejectionReason, setPolledPartnerRejectionReason] = useState<string | undefined>(undefined);
  const [activeVehicle, setActiveVehicle] = useState<any>(userData?.activeVehicle || null);
  const [hasActiveRide, setHasActiveRide] = useState(false);

  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const completedSteps = polledCompletedSteps ?? userData?.partnerOnboardingSteps ?? 0;
  const kycStatus = polledKycStatus ?? userData?.videoKycStatus ?? null;
  const kycRoomId = polledKycRoomId ?? userData?.videoKycRoomId ?? null;
  const kycRejectionReason = polledKycRejectionReason ?? userData?.videoKycRejectionReason ?? null;
  const partnerStatus = polledPartnerStatus ?? userData?.partnerStatus ?? "pending";
  const partnerRejectionReason = polledPartnerRejectionReason ?? userData?.rejectionReason;

  const refreshPartnerState = useCallback(async () => {
    try {
      const res = await axios.get("/api/user/me");
      const u = res.data?.user;
      if (u) {
        setPolledKycStatus(u.videoKycStatus);
        setPolledKycRoomId(u.videoKycRoomId ?? null);
        setPolledKycRejectionReason(u.videoKycRejectionReason ?? null);
        setPolledPartnerStatus(u.partnerStatus);
        setPolledPartnerRejectionReason(u.rejectionReason);
        if (u.partnerOnboardingSteps !== undefined) {
          setPolledCompletedSteps(u.partnerOnboardingSteps);
        }
        setActiveVehicle(u.activeVehicle || null);
      }
      
      const rideRes = await axios.get("/api/partner/bookings/active");
      if (rideRes.data && rideRes.data._id) {
        setHasActiveRide(true);
      } else {
        setHasActiveRide(false);
      }
    } catch (error: any) {
      if (error.response?.status === 404 || error.response?.status === 401) {
        import("next-auth/react").then(({ signOut }) => {
          signOut({ callbackUrl: "/signin" });
        });
      }
      // silently ignore other refresh errors
    }
  }, []);

  // Poll /api/user/me every 8s as a fallback, with socket/focus refreshes for live UI.
  useEffect(() => {
    refreshPartnerState();
    pollRef.current = setInterval(refreshPartnerState, 8000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [refreshPartnerState]);

  useEffect(() => {
    if (!userData?._id) return;

    const socket = getSocket();
    const identify = () => socket.emit("identity", userData._id);
    const refreshSoon = () => {
      window.setTimeout(refreshPartnerState, 250);
    };

    if (socket.connected) identify();
    socket.on("connect", identify);
    socket.on("connect", refreshSoon);
    socket.on("new-booking", refreshSoon);
    socket.on("booking-updated", refreshSoon);
    socket.on("booking-sync", refreshSoon);
    window.addEventListener("focus", refreshPartnerState);

    return () => {
      socket.off("connect", identify);
      socket.off("connect", refreshSoon);
      socket.off("new-booking", refreshSoon);
      socket.off("booking-updated", refreshSoon);
      socket.off("booking-sync", refreshSoon);
      window.removeEventListener("focus", refreshPartnerState);
    };
  }, [refreshPartnerState, userData?._id]);

  const progressPercentage =
    (Math.min(completedSteps, TOTAL_STEPS - 1) / (TOTAL_STEPS - 1)) * 100;
  const isFullyApproved = partnerStatus === "approved" && completedSteps >= TOTAL_STEPS;

  const goToStep = (step: step) => {
    if (step.route && step.id <= completedSteps + 1) {
      router.push(step.route);
    }
  };

  const requestKycRetry = async () => {
    try {
      await axios.post("/api/partner/video-kyc/retry");
      setPolledKycStatus("pending");
      router.refresh();
    } catch (error) {
      console.error("Failed to request KYC retry", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 pt-28 pb-20">
      <div className="max-w-6xl mx-auto">
        {/* Weather Status */}
        <WeatherWidget className="mb-8 max-w-sm" />
        {isFullyApproved ? (
          <>
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-600">
                  Live Partner
                </p>
                <h1 className="mt-2 text-4xl font-bold tracking-tight text-gray-900">
                  Partner Dashboard
                </h1>
                <p className="mt-2 text-lg text-gray-500">
                  Your account is approved and ready to receive rides.
                </p>
              </div>
              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 ring-1 ring-emerald-100">
                <Check size={16} />
                Live on Rydex
              </div>
            </div>

            {/* Active Vehicle Badge */}
            {hasActiveRide && (
              <div className="mb-8 bg-emerald-50 border border-emerald-200 rounded-[28px] p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                    <Car size={24} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-emerald-950 mt-1">Active Ride in Progress</h3>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      You have an ongoing ride. Tap to view details and map.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => router.push("/partner/active-ride")}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl font-bold uppercase tracking-wider transition-all w-fit shadow-md shadow-emerald-600/20"
                >
                  View Ride
                </button>
              </div>
            )}

            <div className="mb-8 bg-white border border-gray-200 rounded-[28px] p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {activeVehicle ? (
                <>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-950 text-white flex items-center justify-center shrink-0">
                      {(() => {
                        switch (activeVehicle.type) {
                          case "bike": return <Bike size={24} />;
                          case "auto": return <Tally3 size={24} />;
                          case "car": return <Car size={24} />;
                          case "loading": return <Package size={24} />;
                          case "truck": return <Truck size={24} />;
                          default: return <Car size={24} />;
                        }
                      })()}
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Active Vehicle</span>
                      <h3 className="text-base font-black text-zinc-900 uppercase mt-0.5">{activeVehicle.brand} {activeVehicle.vehicleModel}</h3>
                      <p className="text-xs text-zinc-500 font-semibold mt-0.5">Plate: <span className="font-mono text-zinc-800 font-bold bg-zinc-100 border border-zinc-200/60 px-1.5 py-0.5 rounded text-[11px]">{activeVehicle.vehicleNumber}</span></p>
                    </div>
                  </div>
                  <Link
                    href="/partner/vehicle"
                    className="text-xs bg-zinc-100 hover:bg-zinc-200 border border-zinc-200/50 text-zinc-800 px-4 py-2.5 rounded-xl font-bold uppercase tracking-wider transition-all w-fit"
                  >
                    Change Active
                  </Link>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={20} />
                    <div>
                      <h3 className="text-sm font-bold text-rose-950">No Active Vehicle Set</h3>
                      <p className="text-xs text-rose-600 mt-0.5">
                        You must select an approved active vehicle from your garage to start receiving rides.
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/partner/vehicle"
                    className="text-xs bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl font-bold uppercase tracking-wider transition-all w-fit shadow-md shadow-rose-600/10"
                  >
                    Select Active
                  </Link>
                </>
              )}
            </div>
          </>
        ) : (
          <>
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
          </>
        )}

        {/* Video KYC Banner — shown when admin initiates a call */}
        <AnimatePresence>
          {!isFullyApproved && kycStatus === "in_progress" && kycRoomId && (
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

          {!isFullyApproved && kycStatus === "rejected" && (
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
        {!isFullyApproved && userData && (
          <div className="mt-8">
            <StatusCard
              status={partnerStatus}
              reason={partnerRejectionReason}
              step={completedSteps}
            />
          </div>
        )}

        {isFullyApproved && (
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="mt-8"
          >
            <PartnerAnalyticsHub />
          </motion.section>
        )}
      </div>
    </div>
  );
}

export default PartnerDashboard;
