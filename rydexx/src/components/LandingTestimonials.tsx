"use client";

import { motion } from "motion/react";
import { Star } from "lucide-react";
import { useRef, useState } from "react";

const testimonials = [
  {
    name: "Ayesha K.",
    role: "Daily commuter",
    avatar: "A",
    rating: 5,
    text: "I use Rydex every single morning. The bike booking is instant and my driver is always there before I even put my phone down. Game changer.",
  },
  {
    name: "Rahul M.",
    role: "Startup founder",
    avatar: "R",
    rating: 5,
    text: "We used Rydex to move office equipment — booked a truck, driver arrived in 18 minutes, live tracking the whole way. Absolutely seamless.",
  },
  {
    name: "Sana T.",
    role: "College student",
    avatar: "S",
    rating: 5,
    text: "The in-app chat feature is what sold me. No need to share my number with the driver. Safe, clean, affordable. Everything I need.",
  },
  {
    name: "Imran B.",
    role: "Freelance photographer",
    avatar: "I",
    rating: 5,
    text: "I've tried every booking app out there. Rydex is the first one that actually feels premium without the premium price tag.",
  },
  {
    name: "Priya L.",
    role: "Healthcare worker",
    avatar: "P",
    rating: 5,
    text: "As someone who works night shifts, 24/7 availability is everything. Rydex has never let me down, not even once at 3am.",
  },
  {
    name: "Ahmed R.",
    role: "Logistics manager",
    avatar: "A",
    rating: 5,
    text: "The KYC verification for drivers gives me peace of mind when sending my staff. Professional, reliable, and fast.",
  },
];

const COLORS = ["#a78bfa", "#34d399", "#60a5fa", "#fb923c", "#f472b6", "#2dd4bf"];

export default function LandingTestimonials() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  return (
    <section className="w-full bg-white py-24 sm:py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-14"
        >
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-8 bg-zinc-300" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">
                Testimonials
              </span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-zinc-900 leading-tight tracking-tight">
              Real riders,{" "}
              <span className="relative inline-block">
                real stories.
                <motion.span
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute -bottom-1 left-0 right-0 h-[3px] bg-zinc-900 origin-left block"
                />
              </span>
            </h2>
          </div>

          {/* Stars summary */}
          <div className="flex items-center gap-3">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={16} className="fill-amber-400 text-amber-400" />
              ))}
            </div>
            <span className="text-sm font-bold text-zinc-900">4.8</span>
            <span className="text-sm text-zinc-400">avg. rating</span>
          </div>
        </motion.div>

        {/* Card grid */}
        <div
          ref={scrollRef}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name + i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -5 }}
              onHoverStart={() => setActive(i)}
              className="group relative flex flex-col gap-5 rounded-3xl border border-zinc-100 bg-zinc-50 p-7 transition-all duration-300 hover:border-zinc-200 hover:bg-white hover:shadow-xl cursor-default overflow-hidden"
            >
              {/* Quote mark */}
              <div className="absolute top-5 right-6 text-6xl font-black text-zinc-100 leading-none select-none group-hover:text-zinc-200 transition-colors">
                &ldquo;
              </div>

              {/* Stars */}
              <div className="flex gap-0.5">
                {[...Array(t.rating)].map((_, j) => (
                  <Star key={j} size={13} className="fill-amber-400 text-amber-400" />
                ))}
              </div>

              {/* Text */}
              <p className="text-sm text-zinc-600 leading-relaxed relative z-10">
                {t.text}
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 mt-auto">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black text-white"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                >
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-900">{t.name}</p>
                  <p className="text-xs text-zinc-400">{t.role}</p>
                </div>
              </div>

              {/* Bottom accent */}
              <motion.div
                className="absolute bottom-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: `linear-gradient(to right, transparent, ${COLORS[i % COLORS.length]}, transparent)` }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
