"use client";

import { motion } from "motion/react";
import { 
  Clock, 
  ShieldCheck, 
  AlertTriangle, 
  RefreshCcw, 
  ChevronRight,
  Video
} from "lucide-react";
import { useRouter } from "next/navigation";

interface StatusCardProps {
  status: "pending" | "approved" | "rejected" | string;
  reason?: string;
  videoKycStatus?: string;
}

export default function StatusCard({ 
  status, 
  reason, 
  videoKycStatus 
}: StatusCardProps) {
  const router = useRouter();

  // If status is missing, default to pending for onboarding visibility
  const effectiveStatus = status || "pending";

  if (effectiveStatus === "idle") return null;

  const config: Record<string, {
    icon: React.ReactNode;
    bg: string;
    border: string;
    title: string;
    description: string;
    accent: string;
    sub: string;
  }> = {
    pending: {
      icon: <Clock className="text-amber-500" size={24} />,
      bg: "bg-amber-50/50",
      border: "border-amber-100",
      title: "Application Under Review",
      description: "Our team is currently verifying your details. This usually takes 24-48 hours.",
      accent: "text-amber-900",
      sub: "text-amber-700/70"
    },
    approved: {
      icon: <ShieldCheck className="text-green-500" size={24} />,
      bg: "bg-green-50/50",
      border: "border-green-100",
      title: "Application Approved",
      description: "Congratulations! Your profile has been verified. You can now start using Rydex.",
      accent: "text-green-900",
      sub: "text-green-700/70"
    },
    rejected: {
      icon: <AlertTriangle className="text-red-500" size={24} />,
      bg: "bg-red-50/50",
      border: "border-red-100",
      title: "Action Required",
      description: reason || "Your application was rejected due to inconsistent information. Please review and update.",
      accent: "text-red-900",
      sub: "text-red-700/70"
    },
    kyc_pending: {
      icon: <Video className="text-violet-500" size={24} />,
      bg: "bg-violet-50/50",
      border: "border-violet-100",
      title: "Video KYC Step",
      description: "You're at the Video KYC phase. Please wait for an admin to initiate a call.",
      accent: "text-violet-900",
      sub: "text-violet-700/70"
    }
  };

  // If at KYC step but admin hasn't initiated yet, show special state
  const isKycStep = videoKycStatus === "pending";
  const displayStatus = (effectiveStatus === "pending" && isKycStep) ? "kyc_pending" : effectiveStatus;

  const currentConfig = config[displayStatus];
  if (!currentConfig) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mt-6 p-5 rounded-[24px] border ${currentConfig.bg} ${currentConfig.border} flex flex-col gap-4 shadow-sm`}
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center shrink-0 border border-inherit/50">
          {currentConfig.icon}
        </div>
        <div className="space-y-1">
          <h3 className={`text-[15px] font-black uppercase tracking-tight ${currentConfig.accent}`}>
            {currentConfig.title}
          </h3>
          <p className={`text-xs font-medium leading-relaxed ${currentConfig.sub}`}>
            {currentConfig.description}
          </p>
        </div>
      </div>

      {status === "rejected" && (
        <button
          onClick={() => router.push("/partner/onboarding/vehicle")}
          className="w-full h-11 bg-white border border-red-100 rounded-xl flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-[0.98] shadow-sm shadow-red-100"
        >
          <RefreshCcw size={14} />
          Review & Update Details
          <ChevronRight size={14} />
        </button>
      )}
    </motion.div>
  );
}
