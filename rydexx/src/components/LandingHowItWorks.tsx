"use client";

import { motion } from "motion/react";
import { UserCircle, Car, MapPin, CheckCircle } from "lucide-react";

const steps = [
  {
    num: "01",
    icon: UserCircle,
    title: "Create an Account",
    desc: "Sign up in seconds with your Google account or email. No lengthy forms.",
    accent: "#a78bfa",
  },
  {
    num: "02",
    icon: Car,
    title: "Choose Your Vehicle",
    desc: "Pick from bikes, cars, SUVs, vans, or trucks — whatever your trip demands.",
    accent: "#34d399",
  },
  {
    num: "03",
    icon: MapPin,
    title: "Set Your Route",
    desc: "Drop a pin or type your destination. We'll calculate the best route and fare instantly.",
    accent: "#60a5fa",
  },
  {
    num: "04",
    icon: CheckCircle,
    title: "Ride & Relax",
    desc: "Your driver is matched instantly. Track them live, chat if needed, and arrive safely.",
    accent: "#fb923c",
  },
];

export default function LandingHowItWorks() {
  return (
    <section className="w-full bg-[#080808] py-24 sm:py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-16"
        >
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-8 bg-white/20" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
                How It Works
              </span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight tracking-tight">
              Up and riding{" "}
              <span className="bg-gradient-to-r from-white/90 to-white/30 bg-clip-text text-transparent">
                in 60 seconds.
              </span>
            </h2>
          </div>
          <p className="text-sm text-white/35 max-w-xs leading-relaxed">
            No waiting rooms, no phone calls, no confusion. Just open, book, go.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Connecting line (desktop) */}
          <div className="absolute top-[52px] left-[12.5%] right-[12.5%] h-px bg-white/6 hidden md:block" />

          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="relative flex flex-col gap-5"
              >
                {/* Number + Icon circle */}
                <div className="relative z-10 flex items-center gap-4 md:flex-col md:items-start">
                  <div
                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/8 backdrop-blur-sm"
                    style={{ backgroundColor: `${step.accent}14` }}
                  >
                    <Icon size={24} style={{ color: step.accent }} strokeWidth={1.8} />
                  </div>
                  <span className="text-5xl font-black text-white/5 leading-none select-none hidden md:block">
                    {step.num}
                  </span>
                </div>

                {/* Text */}
                <div>
                  <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: step.accent }}>
                    Step {step.num}
                  </p>
                  <h3 className="text-lg font-bold text-white mb-2 leading-tight">{step.title}</h3>
                  <p className="text-sm text-white/35 leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
