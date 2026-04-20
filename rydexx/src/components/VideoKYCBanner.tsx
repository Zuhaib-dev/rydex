"use client";

import { motion } from "motion/react";
import { Video, PhoneCall } from "lucide-react";
import { useRouter } from "next/navigation";

interface VideoKYCBannerProps {
  roomId: string;
  partnerName?: string;
}

export default function VideoKYCBanner({
  roomId,
  partnerName,
}: VideoKYCBannerProps) {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="relative overflow-hidden rounded-[24px] border border-violet-200 bg-linear-to-br from-violet-50 via-purple-50 to-indigo-50 p-6 shadow-md shadow-violet-100"
    >
      {/* Animated background pulse rings */}
      <div className="pointer-events-none absolute -left-8 -top-8">
        <motion.div
          animate={{ scale: [1, 1.5, 1], opacity: [0.15, 0, 0.15] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="w-32 h-32 rounded-full bg-violet-400"
        />
      </div>
      <div className="pointer-events-none absolute -right-6 -bottom-6">
        <motion.div
          animate={{ scale: [1, 1.6, 1], opacity: [0.1, 0, 0.1] }}
          transition={{
            duration: 3.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5,
          }}
          className="w-28 h-28 rounded-full bg-indigo-400"
        />
      </div>

      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        {/* Left — icon + text */}
        <div className="flex items-center gap-4">
          {/* Pulsing icon badge */}
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-300">
              <Video className="text-white" size={24} />
            </div>
            {/* Live dot */}
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <motion.span
                animate={{ scale: [1, 1.8, 1], opacity: [0.8, 0, 0.8] }}
                transition={{ duration: 1.8, repeat: Infinity }}
                className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"
              />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500" />
            </span>
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-500">
                Live
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-500 rounded-full uppercase tracking-wider">
                Incoming Call
              </span>
            </div>
            <h3 className="text-[17px] font-black text-gray-900 leading-tight">
              Your Video KYC is Ready
            </h3>
            <p className="text-gray-500 text-xs font-medium">
              {partnerName
                ? `${partnerName}, an`
                : "An"}{" "}
              admin is waiting to verify your identity.
            </p>
          </div>
        </div>

        {/* Right — CTA */}
        <button
          onClick={() => router.push(`/video-kyc/${roomId}`)}
          className="group relative shrink-0 flex items-center gap-2.5 px-6 py-3.5 bg-violet-600 hover:bg-violet-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-violet-200 hover:shadow-violet-300 transition-all active:scale-[0.97]"
        >
          <PhoneCall size={16} className="group-hover:animate-bounce" />
          Join Now
          {/* shimmer */}
          <motion.div
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
            className="absolute inset-0 w-1/2 bg-linear-to-r from-transparent via-white/20 to-transparent skew-x-12 pointer-events-none"
          />
        </button>
      </div>
    </motion.div>
  );
}
