"use client";

import { motion } from "motion/react";
import {
  Clock,
  ShieldCheck,
  AlertTriangle,
  RefreshCcw,
  ChevronRight,
  FileText,
  BadgeCheck,
  VideoIcon,
  IndianRupee,
  Hourglass,
  CircleCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface StatusCardProps {
  status: "pending" | "approved" | "rejected" | string;
  reason?: string;
  step?: number; // partnerOnboardingSteps
}

// Step-specific pending states — maps current step to a contextual message
const STEP_CONTEXTS: Record<
  number,
  { icon: React.ReactNode; title: string; description: string; badge: string }
> = {
  1: {
    icon: <FileText className="text-amber-500" size={22} />,
    title: "Vehicle Details Submitted",
    description:
      "Your vehicle info has been saved. Continue with document upload to move forward.",
    badge: "Step 1 of 8 — Continue onboarding",
  },
  2: {
    icon: <FileText className="text-amber-500" size={22} />,
    title: "Documents Uploaded",
    description:
      "Your documents are saved. Add your bank details to complete this section.",
    badge: "Step 2 of 8 — Continue onboarding",
  },
  3: {
    icon: <Clock className="text-amber-500" size={22} />,
    title: "Awaiting Admin Review",
    description:
      "Your vehicle, documents, and bank details have been submitted. Our team will review and approve your application shortly.",
    badge: "Step 3 of 8 — Under review",
  },
  4: {
    icon: <VideoIcon className="text-violet-500" size={22} />,
    title: "Video KYC Scheduled",
    description:
      "Your documents are approved! An admin will initiate a video verification call. Stay available.",
    badge: "Step 4 of 8 — KYC pending",
  },
  5: {
    icon: <BadgeCheck className="text-violet-500" size={22} />,
    title: "KYC Approved — Set Your Pricing",
    description:
      "Great news! Your identity has been verified. Head to the Pricing step to set your fares and upload your vehicle photo.",
    badge: "Step 5 of 8 — Action needed",
  },
  6: {
    icon: <IndianRupee className="text-blue-500" size={22} />,
    title: "Pricing Submitted",
    description:
      "Your pricing and vehicle image have been submitted. An admin will do a final review before you go live.",
    badge: "Step 6 of 8 — Final review pending",
  },
  7: {
    icon: <Hourglass className="text-blue-500" size={22} />,
    title: "Final Review In Progress",
    description:
      "Everything looks great! Our team is doing a final check before activating your account.",
    badge: "Step 7 of 8 — Almost there",
  },
  8: {
    icon: <CircleCheck className="text-green-500" size={22} />,
    title: "You're Live on Rydex!",
    description:
      "Your account is fully active. You can now accept rides and start earning.",
    badge: "Step 8 of 8 — Active",
  },
};

const STEP_BADGE_COLORS: Record<number, string> = {
  1: "bg-amber-100 text-amber-700",
  2: "bg-amber-100 text-amber-700",
  3: "bg-amber-100 text-amber-700",
  4: "bg-violet-100 text-violet-700",
  5: "bg-violet-100 text-violet-700",
  6: "bg-blue-100 text-blue-700",
  7: "bg-blue-100 text-blue-700",
  8: "bg-green-100 text-green-700",
};

const STEP_COLORS: Record<
  number,
  { bg: string; border: string; accent: string; sub: string }
> = {
  1: { bg: "bg-amber-50/60", border: "border-amber-100", accent: "text-amber-900", sub: "text-amber-700/70" },
  2: { bg: "bg-amber-50/60", border: "border-amber-100", accent: "text-amber-900", sub: "text-amber-700/70" },
  3: { bg: "bg-amber-50/60", border: "border-amber-100", accent: "text-amber-900", sub: "text-amber-700/70" },
  4: { bg: "bg-violet-50/60", border: "border-violet-100", accent: "text-violet-900", sub: "text-violet-700/70" },
  5: { bg: "bg-violet-50/60", border: "border-violet-100", accent: "text-violet-900", sub: "text-violet-700/70" },
  6: { bg: "bg-blue-50/60", border: "border-blue-100", accent: "text-blue-900", sub: "text-blue-700/70" },
  7: { bg: "bg-blue-50/60", border: "border-blue-100", accent: "text-blue-900", sub: "text-blue-700/70" },
  8: { bg: "bg-green-50/60", border: "border-green-100", accent: "text-green-900", sub: "text-green-700/70" },
};

export default function StatusCard({ status, reason, step = 0 }: StatusCardProps) {
  const router = useRouter();

  // Approved override — always show success card
  if (status === "approved" && step >= 8) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6 p-5 rounded-[24px] border bg-green-50/60 border-green-100 flex flex-col gap-4 shadow-sm"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center shrink-0 border border-green-100">
            <ShieldCheck className="text-green-500" size={24} />
          </div>
          <div className="space-y-1">
            <span className="inline-block text-[10px] font-black uppercase tracking-widest bg-green-100 text-green-700 px-2 py-0.5 rounded-full mb-1">
              Active
            </span>
            <h3 className="text-[15px] font-black uppercase tracking-tight text-green-900">
              You&#39;re Live on Rydex!
            </h3>
            <p className="text-xs font-medium leading-relaxed text-green-700/70">
              Your account is fully verified and active. Start accepting rides and earning today.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  // Rejected — always show rejection card
  if (status === "rejected") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6 p-5 rounded-[24px] border bg-red-50/60 border-red-100 flex flex-col gap-4 shadow-sm"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center shrink-0 border border-red-100">
            <AlertTriangle className="text-red-500" size={24} />
          </div>
          <div className="space-y-1">
            <span className="inline-block text-[10px] font-black uppercase tracking-widest bg-red-100 text-red-600 px-2 py-0.5 rounded-full mb-1">
              Action Required
            </span>
            <h3 className="text-[15px] font-black uppercase tracking-tight text-red-900">
              Application Rejected
            </h3>
            <p className="text-xs font-medium leading-relaxed text-red-700/70">
              {reason || "Your application was rejected due to inconsistent information. Please review and update your details."}
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push("/partner/onboarding/vehicle")}
          className="w-full h-11 bg-white border border-red-100 rounded-xl flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-[0.98] shadow-sm shadow-red-100"
        >
          <RefreshCcw size={14} />
          Review &amp; Update Details
          <ChevronRight size={14} />
        </button>
      </motion.div>
    );
  }

  // Step-aware pending states (step 1–8)
  const stepCtx = STEP_CONTEXTS[step];
  const stepColor = STEP_COLORS[step];
  const badgeColor = STEP_BADGE_COLORS[step];

  // Don't render anything for step 0 (not yet started)
  if (!stepCtx || !stepColor) return null;

  return (
    <motion.div
      key={step}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mt-6 p-5 rounded-[24px] border ${stepColor.bg} ${stepColor.border} flex flex-col gap-3 shadow-sm`}
    >
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center shrink-0 border ${stepColor.border}`}>
          {stepCtx.icon}
        </div>
        <div className="space-y-1 flex-1">
          <span className={`inline-block text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mb-1 ${badgeColor}`}>
            {stepCtx.badge}
          </span>
          <h3 className={`text-[15px] font-black uppercase tracking-tight ${stepColor.accent}`}>
            {stepCtx.title}
          </h3>
          <p className={`text-xs font-medium leading-relaxed ${stepColor.sub}`}>
            {stepCtx.description}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
