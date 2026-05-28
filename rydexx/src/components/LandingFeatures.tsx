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
import {
  EASE,
  GridPattern,
  SectionLabel,
  SectionTitle,
} from "./landing/ui";

const features = [
  {
    icon: Zap,
    title: "Instant Matching",
    desc: "Smart dispatch finds the nearest verified driver in seconds — with automatic cascade if they don't respond.",
    size: "large",
  },
  {
    icon: MapPin,
    title: "Live GPS Tracking",
    desc: "Watch your ride move in real time, every second of the journey.",
    size: "small",
  },
  {
    icon: MessageSquare,
    title: "In-App Chat",
    desc: "Coordinate with your driver without sharing your phone number.",
    size: "small",
  },
  {
    icon: ShieldCheck,
    title: "Verified Drivers",
    desc: "KYC, document checks, and video verification before any partner goes live.",
    size: "medium",
  },
  {
    icon: CreditCard,
    title: "Secure Payments",
    desc: "Razorpay-powered checkout with full payment protection.",
    size: "small",
  },
  {
    icon: Truck,
    title: "Every Vehicle Type",
    desc: "Bikes to heavy trucks — one platform for every trip.",
    size: "small",
  },
  {
    icon: Clock,
    title: "24 / 7 Support",
    desc: "Round-the-clock availability with no blackout hours.",
    size: "small",
  },
  {
    icon: Star,
    title: "Rated & Reviewed",
    desc: "Real feedback and praise badges after every completed ride.",
    size: "small",
  },
];

const sizeMap = {
  large: "md:col-span-2 md:row-span-2",
  medium: "md:col-span-2",
  small: "md:col-span-1",
};

export default function LandingFeatures() {
  return (
    <section className="relative landing-section overflow-hidden bg-landing-bg landing-noise">
      <GridPattern light />
      <div className="landing-container relative">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: EASE }}
          className="mb-14 max-w-2xl lg:mb-16"
        >
          <SectionLabel light>Platform</SectionLabel>
          <SectionTitle
            light
            className="mt-4"
            subtitle="Everything riders and partners need — built for speed, safety, and scale."
          >
            Built for the ride,{" "}
            <span className="text-accent-gradient">not the friction.</span>
          </SectionTitle>
        </motion.div>

        <div className="grid auto-rows-[minmax(140px,auto)] grid-cols-1 gap-4 md:grid-cols-4 md:auto-rows-[160px]">
          {features.map((f, i) => {
            const Icon = f.icon;
            const isLarge = f.size === "large";
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.06, duration: 0.5, ease: EASE }}
                whileHover={{ y: -3 }}
                className={`group glass-dark relative cursor-default overflow-hidden rounded-3xl p-6 transition-[border-color,box-shadow] duration-400 hover:border-white/14 hover:shadow-[0_20px_60px_rgba(0,0,0,0.35)] ${
                  sizeMap[f.size as keyof typeof sizeMap]
                }`}
              >
                <div
                  className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-landing-accent/0 blur-2xl transition-all duration-500 group-hover:bg-landing-accent/15"
                  aria-hidden
                />

                <div className="relative z-10 flex h-full flex-col">
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-landing-accent/10 text-landing-accent transition-colors group-hover:bg-landing-accent/18">
                    <Icon size={20} strokeWidth={2} />
                  </div>

                  <h3
                    className={`font-display font-semibold leading-tight text-white/95 ${
                      isLarge ? "text-xl sm:text-2xl" : "text-base"
                    }`}
                  >
                    {f.title}
                  </h3>
                  <p
                    className={`mt-2 leading-relaxed text-white/40 ${
                      isLarge ? "text-sm sm:text-base max-w-sm" : "text-sm"
                    }`}
                  >
                    {f.desc}
                  </p>

                  {isLarge && (
                    <div className="mt-auto pt-6">
                      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-landing-accent/80">
                        <span className="h-1.5 w-1.5 rounded-full bg-landing-accent animate-pulse" />
                        Matchmaker active
                      </div>
                    </div>
                  )}
                </div>

                <div className="absolute bottom-0 left-6 right-6 h-px bg-linear-to-r from-transparent via-landing-accent/30 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
