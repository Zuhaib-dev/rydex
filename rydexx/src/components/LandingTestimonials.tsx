"use client";

import { motion } from "motion/react";
import { Star, Quote } from "lucide-react";
import { EASE, SectionLabel, SectionTitle } from "./landing/ui";

const testimonials = [
  {
    name: "Ayesha K.",
    role: "Daily commuter",
    avatar: "A",
    text: "I use Rydex every morning. The bike booking is instant and my driver is always there before I put my phone down.",
    featured: true,
  },
  {
    name: "Rahul M.",
    role: "Startup founder",
    avatar: "R",
    text: "We moved office equipment on a truck — driver in 18 minutes, live tracking the whole way. Absolutely seamless.",
  },
  {
    name: "Sana T.",
    role: "College student",
    avatar: "S",
    text: "In-app chat sold me. No sharing my number. Safe, clean, affordable — everything I need.",
  },
  {
    name: "Imran B.",
    role: "Freelance photographer",
    avatar: "I",
    text: "The first booking app that feels premium without the premium price tag. Design and speed both deliver.",
  },
  {
    name: "Priya L.",
    role: "Healthcare worker",
    avatar: "P",
    text: "Night shifts need 24/7 availability. Rydex has never let me down — not even at 3am.",
  },
  {
    name: "Ahmed R.",
    role: "Logistics manager",
    avatar: "A",
    text: "KYC verification gives me peace of mind when sending staff. Professional, reliable, and fast.",
  },
];

const AVATAR_GRADIENTS = [
  "from-violet-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-sky-500 to-blue-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-cyan-500 to-emerald-600",
];

export default function LandingTestimonials() {
  return (
    <section className="landing-section overflow-hidden bg-[#fafafa]">
      <div className="landing-container">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: EASE }}
          className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <SectionLabel>Stories</SectionLabel>
            <SectionTitle className="mt-4">
              Loved by riders{" "}
              <span className="text-zinc-400">everywhere.</span>
            </SectionTitle>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white px-4 py-3 shadow-sm">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={14}
                  className="-mr-0.5 fill-amber-400 text-amber-400"
                />
              ))}
            </div>
            <div>
              <p className="text-sm font-bold text-zinc-900">4.8</p>
              <p className="text-[10px] text-zinc-400">Average rating</p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Featured card */}
          <motion.article
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, ease: EASE }}
            className="relative overflow-hidden rounded-3xl bg-zinc-950 p-8 text-white lg:col-span-5 lg:p-10"
          >
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-landing-accent/15 blur-3xl" />
            <Quote
              size={40}
              className="text-landing-accent/40"
              strokeWidth={1.25}
            />
            <p className="relative mt-6 font-display text-xl font-medium leading-snug tracking-tight sm:text-2xl">
              &ldquo;{testimonials[0].text}&rdquo;
            </p>
            <div className="relative mt-8 flex items-center gap-3">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-full bg-linear-to-br ${AVATAR_GRADIENTS[0]} text-sm font-bold`}
              >
                {testimonials[0].avatar}
              </div>
              <div>
                <p className="font-semibold">{testimonials[0].name}</p>
                <p className="text-sm text-white/45">{testimonials[0].role}</p>
              </div>
            </div>
          </motion.article>

          {/* Grid */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:col-span-7">
            {testimonials.slice(1).map((t, i) => (
              <motion.article
                key={t.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.5, ease: EASE }}
                whileHover={{ y: -3 }}
                className="group flex flex-col gap-4 rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] transition-shadow hover:shadow-[0_16px_48px_rgba(0,0,0,0.08)]"
              >
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, j) => (
                    <Star
                      key={j}
                      size={12}
                      className="fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>
                <p className="flex-1 text-sm leading-relaxed text-zinc-600">
                  {t.text}
                </p>
                <div className="flex items-center gap-3 border-t border-zinc-100 pt-4">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br ${AVATAR_GRADIENTS[(i + 1) % AVATAR_GRADIENTS.length]} text-xs font-bold text-white`}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">
                      {t.name}
                    </p>
                    <p className="text-xs text-zinc-400">{t.role}</p>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
