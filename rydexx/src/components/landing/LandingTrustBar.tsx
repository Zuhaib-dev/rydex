"use client";

import { motion } from "motion/react";
import { ShieldCheck, Zap, MapPin, CreditCard } from "lucide-react";
import { EASE } from "./ui";

const items = [
  { icon: ShieldCheck, label: "KYC-verified partners" },
  { icon: Zap, label: "Sub-60s matching" },
  { icon: MapPin, label: "Live GPS tracking" },
  { icon: CreditCard, label: "Secure Razorpay checkout" },
];

export default function LandingTrustBar() {
  return (
    <section className="relative z-20 -mt-1 border-y border-white/6 bg-landing-bg landing-noise">
      <div className="landing-container py-5">
        <motion.ul
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.85, ease: EASE }}
          className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 sm:gap-x-12"
        >
          {items.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="flex items-center gap-2 text-xs font-medium text-white/45 sm:text-sm"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/6 text-landing-accent">
                <Icon size={14} strokeWidth={2} />
              </span>
              {label}
            </li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
