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
import { EASE, SectionLabel, SectionTitle } from "./landing/ui";

type Vehicle = {
  title: string;
  desc: string;
  icon: ElementType;
  tag: string;
};

const vehicles: Vehicle[] = [
  { title: "All Vehicles", desc: "Browse the full fleet", icon: LayoutGrid, tag: "Popular" },
  { title: "Bikes", desc: "Fast & affordable", icon: Bike, tag: "Solo" },
  { title: "Cars", desc: "Comfortable city travel", icon: Car, tag: "Comfort" },
  { title: "SUVs", desc: "Premium & spacious", icon: CarFront, tag: "Premium" },
  { title: "Vans", desc: "Group & family trips", icon: Bus, tag: "Family" },
  { title: "Trucks", desc: "Heavy cargo & delivery", icon: Truck, tag: "Cargo" },
  { title: "Minivans", desc: "Up to 8 passengers", icon: Users, tag: "Group" },
];

const SCROLL_AMOUNT = 280;

function VehicleSlider() {
  const [active, setActive] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: dir === "left" ? -SCROLL_AMOUNT : SCROLL_AMOUNT,
      behavior: "smooth",
    });
  };

  return (
    <section className="landing-section overflow-hidden bg-[#fafafa]">
      <div className="landing-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: EASE }}
          className="mb-10 flex items-end justify-between gap-6 sm:mb-14"
        >
          <div>
            <SectionLabel>Fleet</SectionLabel>
            <SectionTitle className="mt-4">
              Every ride type,{" "}
              <span className="text-zinc-400">one tap away.</span>
            </SectionTitle>
            <p className="mt-3 max-w-sm text-sm text-zinc-500">
              Choose the vehicle that fits your journey — from solo commutes to
              full cargo loads.
            </p>
          </div>

          <div className="hidden shrink-0 gap-2 sm:flex">
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => scroll("left")}
              aria-label="Scroll fleet left"
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-700 shadow-sm transition hover:border-zinc-900 hover:bg-zinc-950 hover:text-white"
            >
              <ChevronLeft size={18} strokeWidth={2.5} />
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => scroll("right")}
              aria-label="Scroll fleet right"
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-700 shadow-sm transition hover:border-zinc-900 hover:bg-zinc-950 hover:text-white"
            >
              <ChevronRight size={18} strokeWidth={2.5} />
            </motion.button>
          </div>
        </motion.div>

        <div
          ref={scrollRef}
          className="scrollbar-hide -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 pt-2 sm:-mx-0 sm:px-0"
        >
          {vehicles.map((v, i) => {
            const Icon = v.icon;
            const isActive = active === i;
            return (
              <motion.button
                type="button"
                key={v.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.45, ease: EASE }}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onClick={() => setActive(i)}
                whileHover={{ y: -4 }}
                className="shrink-0 w-[200px] text-left sm:w-[220px]"
              >
                <motion.div
                  animate={{
                    backgroundColor: isActive ? "#09090b" : "#ffffff",
                    borderColor: isActive ? "#09090b" : "rgba(0,0,0,0.08)",
                    boxShadow: isActive
                      ? "0 24px 50px rgba(0,0,0,0.18)"
                      : "0 4px 20px rgba(0,0,0,0.04)",
                  }}
                  transition={{ duration: 0.25, ease: EASE }}
                  className="flex h-full min-h-[220px] flex-col gap-8 rounded-3xl border p-6"
                >
                  <span
                    className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest ${
                      isActive
                        ? "bg-white/10 text-white/70"
                        : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    <Sparkles size={9} className="opacity-70" />
                    {v.tag}
                  </span>

                  <Icon
                    size={32}
                    strokeWidth={1.5}
                    className={isActive ? "text-white" : "text-zinc-900"}
                  />

                  <div className="mt-auto">
                    <p
                      className={`font-display text-base font-semibold ${
                        isActive ? "text-white" : "text-zinc-900"
                      }`}
                    >
                      {v.title}
                    </p>
                    <p
                      className={`mt-1 text-xs leading-relaxed ${
                        isActive ? "text-white/50" : "text-zinc-500"
                      }`}
                    >
                      {v.desc}
                    </p>
                  </div>
                </motion.div>
              </motion.button>
            );
          })}
        </div>

        <div className="mt-8 flex justify-center gap-3 sm:hidden">
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => scroll("left")}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200"
            aria-label="Scroll left"
          >
            <ChevronLeft size={16} />
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => scroll("right")}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200"
            aria-label="Scroll right"
          >
            <ChevronRight size={16} />
          </motion.button>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mt-12 flex flex-wrap items-center gap-8 border-t border-zinc-200/80 pt-8"
        >
          {[
            { value: "6+", label: "Categories" },
            { value: "10+", label: "Vehicle types" },
            { value: "24/7", label: "Availability" },
          ].map((s) => (
            <div key={s.label} className="flex items-baseline gap-2">
              <span className="font-display text-xl font-bold text-zinc-950">
                {s.value}
              </span>
              <span className="text-sm text-zinc-400">{s.label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

export default VehicleSlider;
