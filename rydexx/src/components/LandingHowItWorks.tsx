"use client";

import { motion } from "motion/react";
import { UserCircle, Car, MapPin, CheckCircle } from "lucide-react";
import { EASE, GridPattern, SectionLabel, SectionTitle } from "./landing/ui";

const steps = [
  {
    num: "01",
    icon: UserCircle,
    title: "Create an account",
    desc: "Sign up with Google or email in seconds. No lengthy forms.",
  },
  {
    num: "02",
    icon: Car,
    title: "Choose your vehicle",
    desc: "Bikes, cars, SUVs, vans, or trucks — matched to your trip.",
  },
  {
    num: "03",
    icon: MapPin,
    title: "Set your route",
    desc: "Drop a pin or type an address. Instant fare estimate.",
  },
  {
    num: "04",
    icon: CheckCircle,
    title: "Ride & relax",
    desc: "Track live, chat in-app, and arrive safely with OTP verification.",
  },
];

export default function LandingHowItWorks() {
  return (
    <section className="relative landing-section overflow-hidden bg-landing-bg landing-noise">
      <GridPattern light />
      <div className="landing-container relative">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: EASE }}
          className="mb-16 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
        >
          <div className="max-w-xl">
            <SectionLabel light>How it works</SectionLabel>
            <SectionTitle light className="mt-4">
              Up and riding in{" "}
              <span className="text-accent-gradient">60 seconds.</span>
            </SectionTitle>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-white/40">
            No phone calls, no waiting rooms. Open the app, book, and go.
          </p>
        </motion.div>

        <div className="relative grid grid-cols-1 gap-8 md:grid-cols-4 md:gap-6">
          <div className="absolute top-[2.75rem] left-[12%] right-[12%] hidden h-px md:block">
            <div className="h-full w-full bg-white/[0.06]" />
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, delay: 0.3, ease: EASE }}
              className="absolute inset-y-0 left-0 w-full origin-left bg-linear-to-r from-landing-accent/60 via-landing-accent/30 to-transparent"
            />
          </div>

          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.55, ease: EASE }}
                className="relative flex flex-col gap-5"
              >
                <div className="relative z-10 flex items-center gap-4 md:flex-col md:items-start">
                  <motion.div
                    whileHover={{ scale: 1.04 }}
                    className="flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-landing-accent shadow-[0_8px_32px_rgba(0,0,0,0.2)]"
                  >
                    <Icon size={22} strokeWidth={1.75} />
                  </motion.div>
                  <span className="font-display hidden text-5xl font-bold leading-none text-white/[0.04] md:block">
                    {step.num}
                  </span>
                </div>

                <div>
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-landing-accent/90">
                    Step {step.num}
                  </p>
                  <h3 className="mt-2 font-display text-lg font-semibold text-white">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/40">
                    {step.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
