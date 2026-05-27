"use client";

import { motion, useInView } from "motion/react";
import { useRef, useEffect, useState } from "react";

const stats = [
  { value: 1200, suffix: "+", label: "Rides Completed", desc: "And counting every day" },
  { value: 50, suffix: "+", label: "Partner Drivers", desc: "Verified & background-checked" },
  { value: 6, suffix: "+", label: "Vehicle Types", desc: "Bikes to heavy trucks" },
  { value: 4.8, suffix: "★", label: "Average Rating", desc: "Across all rides", isFloat: true },
];

function CountUp({
  target,
  suffix,
  isFloat,
  start,
}: {
  target: number;
  suffix: string;
  isFloat?: boolean;
  start: boolean;
}) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!start) return;
    const duration = 1800;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= target) {
        setVal(target);
        clearInterval(interval);
      } else {
        setVal(isFloat ? Math.round(current * 10) / 10 : Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [start, target, isFloat]);

  return (
    <span>
      {isFloat ? val.toFixed(1) : val.toLocaleString()}
      {suffix}
    </span>
  );
}

export default function LandingStats() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="w-full bg-white py-24 sm:py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        {/* Label */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3 mb-6"
        >
          <div className="h-px w-8 bg-zinc-300" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">
            By the Numbers
          </span>
        </motion.div>

        <div
          ref={ref}
          className="grid grid-cols-2 md:grid-cols-4 gap-px bg-zinc-100 rounded-3xl overflow-hidden border border-zinc-100"
        >
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="bg-white px-8 py-10 sm:py-14 flex flex-col gap-2"
            >
              <p className="text-4xl sm:text-5xl font-black text-zinc-900 tabular-nums leading-none">
                <CountUp
                  target={s.value}
                  suffix={s.suffix}
                  isFloat={s.isFloat}
                  start={inView}
                />
              </p>
              <p className="text-sm font-bold text-zinc-900 mt-3">{s.label}</p>
              <p className="text-xs text-zinc-400">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
