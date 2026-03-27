"use client";

import {
  Bike,
  Car,
  Truck,
  Users,
  Bus,
  CarFront,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Sparkles,
} from "lucide-react";
import { ElementType, useRef, useState } from "react";
import { motion } from "motion/react";

type Vehicle = {
  title: string;
  desc: string;
  icon: ElementType;
  tag: string;
};

const vehicles: Vehicle[] = [
  {
    title: "All Vehicles",
    desc: "Browse the full fleet",
    icon: LayoutGrid,
    tag: "popular",
  },
  {
    title: "Bikes",
    desc: "Fast & affordable rides",
    icon: Bike,
    tag: "solo",
  },
  {
    title: "Cars",
    desc: "Comfortable city travel",
    icon: Car,
    tag: "comfort",
  },
  {
    title: "SUVs",
    desc: "Premium & spacious",
    icon: CarFront,
    tag: "premium",
  },
  {
    title: "Vans",
    desc: "Group & family trips",
    icon: Bus,
    tag: "family",
  },
  {
    title: "Trucks",
    desc: "Heavy cargo & delivery",
    icon: Truck,
    tag: "cargo",
  },
  {
    title: "Minivans",
    desc: "Seat up to 8 passengers",
    icon: Users,
    tag: "family",
  },
];

const SCROLL_AMOUNT = 300;

function VehcileSlider() {
  const [hovered, setHovered] = useState<number | null>(1); // "Bikes" active by default like the image
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    scrollRef.current?.scrollBy({ left: -SCROLL_AMOUNT, behavior: "smooth" });
  };
  const scrollRight = () => {
    scrollRef.current?.scrollBy({ left: SCROLL_AMOUNT, behavior: "smooth" });
  };

  return (
    <section className="w-full bg-white py-16 sm:py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">

        {/* ── Header row ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-start justify-between mb-10 sm:mb-14"
        >
          {/* Left: title */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px w-8 bg-zinc-900" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                Fleet
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-zinc-900 leading-tight">
              Vehicles
              <br />
              <span className="relative inline-block">
                Categories
                <motion.span
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.55, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute -bottom-1 left-0 right-0 h-[2px] bg-zinc-900 origin-left block"
                />
              </span>
            </h2>
            <p className="text-zinc-500 mt-4 text-sm">
              Choose the ride that fits your journey
            </p>
          </div>

          {/* Right: arrows */}
          <div className="hidden sm:flex items-center gap-2 mt-1">
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={scrollLeft}
              className="w-11 h-11 rounded-2xl border border-zinc-200 bg-white flex items-center justify-center text-zinc-700 hover:bg-zinc-900 hover:border-zinc-900 hover:text-white transition-all shadow-sm"
            >
              <ChevronLeft size={18} strokeWidth={2.5} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={scrollRight}
              className="w-11 h-11 rounded-2xl border border-zinc-200 bg-white flex items-center justify-center text-zinc-700 hover:bg-zinc-900 hover:border-zinc-900 hover:text-white transition-all shadow-sm"
            >
              <ChevronRight size={18} strokeWidth={2.5} />
            </motion.button>
          </div>
        </motion.div>

        {/* ── Cards slider ── */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scroll-smooth pt-8 pb-4"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {vehicles.map((v, i) => {
            const Icon = v.icon;
            const isActive = hovered === i;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  delay: i * 0.07,
                  duration: 0.45,
                  ease: [0.22, 1, 0.36, 1],
                }}
                onHoverStart={() => setHovered(i)}
                onHoverEnd={() => setHovered(null)}
                whileHover={{ y: -6 }}
                onClick={() => setHovered(i)}
                className="flex-shrink-0 w-[200px] sm:w-[220px] cursor-pointer"
              >
                <motion.div
                  animate={{
                    backgroundColor: isActive ? "#09090b" : "#ffffff",
                    borderColor: isActive ? "#09090b" : "#e4e4e7",
                    boxShadow: isActive
                      ? "0 20px 50px rgba(0,0,0,0.22)"
                      : "0 2px 12px rgba(0,0,0,0.06)",
                  }}
                  transition={{ duration: 0.22 }}
                  className="rounded-3xl border p-6 h-full flex flex-col gap-8"
                >
                  {/* Tag badge */}
                  <div className="flex items-center gap-1.5">
                    <motion.span
                      animate={{
                        backgroundColor: isActive ? "rgba(255,255,255,0.12)" : "#f4f4f5",
                        color: isActive ? "#ffffff" : "#71717a",
                      }}
                      transition={{ duration: 0.22 }}
                      className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                    >
                      <Sparkles size={9} className="opacity-70" />
                      {v.tag}
                    </motion.span>
                  </div>

                  {/* Icon */}
                  <motion.div
                    animate={{ color: isActive ? "#ffffff" : "#09090b" }}
                    transition={{ duration: 0.22 }}
                  >
                    <Icon size={32} strokeWidth={1.5} />
                  </motion.div>

                  {/* Text */}
                  <div className="mt-auto">
                    <motion.p
                      animate={{ color: isActive ? "#ffffff" : "#09090b" }}
                      transition={{ duration: 0.22 }}
                      className="font-bold text-base leading-tight"
                    >
                      {v.title}
                    </motion.p>
                    <motion.p
                      animate={{ color: isActive ? "rgba(255,255,255,0.55)" : "#71717a" }}
                      transition={{ duration: 0.22 }}
                      className="text-xs mt-1 leading-relaxed"
                    >
                      {v.desc}
                    </motion.p>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        {/* Mobile arrows */}
        <div className="flex sm:hidden items-center justify-center gap-3 mt-6">
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={scrollLeft}
            className="w-10 h-10 rounded-xl border border-zinc-200 flex items-center justify-center text-zinc-700 hover:bg-zinc-900 hover:text-white transition-all"
          >
            <ChevronLeft size={16} strokeWidth={2.5} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={scrollRight}
            className="w-10 h-10 rounded-xl border border-zinc-200 flex items-center justify-center text-zinc-700 hover:bg-zinc-900 hover:text-white transition-all"
          >
            <ChevronRight size={16} strokeWidth={2.5} />
          </motion.button>
        </div>

        {/* ── Stats row ── */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="flex items-center gap-8 mt-12 pt-8 border-t border-zinc-100"
        >
          {[
            { value: "6+", label: "Categories" },
            { value: "10+", label: "Vehicle types" },
            { value: "24/7", label: "Availability" },
          ].map((s) => (
            <div key={s.label} className="flex items-baseline gap-1.5">
              <span className="text-xl font-black text-zinc-900">{s.value}</span>
              <span className="text-sm text-zinc-400">{s.label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

export default VehcileSlider;
