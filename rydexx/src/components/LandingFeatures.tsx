"use client";

import { motion } from "motion/react";
import {
  MapPin,
  Zap,
  ShieldCheck,
  MessageSquare,
  CreditCard,
  Clock,
  Star,
  Truck,
} from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Instant Matching",
    desc: "Our smart matchmaker dispatches the nearest available driver within seconds.",
    size: "large",
    accent: "#facc15",
  },
  {
    icon: MapPin,
    title: "Live GPS Tracking",
    desc: "Track your ride in real-time, every second of the way.",
    size: "small",
    accent: "#34d399",
  },
  {
    icon: MessageSquare,
    title: "In-App Chat",
    desc: "Message your driver directly — no need to share your number.",
    size: "small",
    accent: "#60a5fa",
  },
  {
    icon: ShieldCheck,
    title: "Verified Drivers",
    desc: "Every partner goes through KYC, document verification, and background checks before going live.",
    size: "medium",
    accent: "#a78bfa",
  },
  {
    icon: CreditCard,
    title: "Secure Payments",
    desc: "Razorpay-powered checkout with full refund protection.",
    size: "small",
    accent: "#fb923c",
  },
  {
    icon: Truck,
    title: "Every Vehicle Type",
    desc: "Bikes to trucks — whatever you need, we have it.",
    size: "small",
    accent: "#f472b6",
  },
  {
    icon: Clock,
    title: "24 / 7 Support",
    desc: "Round-the-clock availability, no black-out hours.",
    size: "small",
    accent: "#2dd4bf",
  },
  {
    icon: Star,
    title: "Rated & Reviewed",
    desc: "Real feedback from real riders after every trip.",
    size: "small",
    accent: "#facc15",
  },
];

const sizeMap = {
  large: "md:col-span-2 md:row-span-2",
  medium: "md:col-span-2",
  small: "md:col-span-1",
};

export default function LandingFeatures() {
  return (
    <section className="w-full bg-[#080808] py-24 sm:py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-16 max-w-xl"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-8 bg-white/20" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
              Why Rydex
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight tracking-tight">
            Everything you need,{" "}
            <span className="bg-gradient-to-r from-white/90 to-white/30 bg-clip-text text-transparent">
              nothing you don&apos;t.
            </span>
          </h2>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-[160px]">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -4, scale: 1.01 }}
                className={`group relative rounded-3xl border border-white/6 bg-white/[0.03] p-6 backdrop-blur-sm overflow-hidden cursor-default transition-all duration-300 hover:border-white/12 hover:bg-white/[0.06] ${
                  sizeMap[f.size as keyof typeof sizeMap]
                }`}
              >
                {/* Glow blob */}
                <div
                  className="absolute -top-12 -right-12 h-32 w-32 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-20"
                  style={{ backgroundColor: f.accent }}
                />

                {/* Icon */}
                <div
                  className="mb-4 inline-flex items-center justify-center rounded-2xl p-2.5 transition-colors duration-300"
                  style={{ backgroundColor: `${f.accent}18` }}
                >
                  <Icon size={20} style={{ color: f.accent }} strokeWidth={2} />
                </div>

                {/* Text */}
                <h3 className="text-base font-bold text-white/90 mb-1.5 leading-tight">
                  {f.title}
                </h3>
                <p className="text-sm text-white/35 leading-relaxed">
                  {f.desc}
                </p>

                {/* Bottom line decoration */}
                <motion.div
                  className="absolute bottom-0 left-6 right-6 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: `linear-gradient(to right, transparent, ${f.accent}60, transparent)` }}
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
