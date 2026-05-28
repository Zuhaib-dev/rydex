"use client";

import { motion, useInView } from "motion/react";
import { useRef, useEffect, useState } from "react";
import { EASE, SectionLabel, SectionTitle } from "./landing/ui";

const stats = [
  {
    value: 1200,
    suffix: "+",
    label: "Rides completed",
    desc: "Growing every single day",
  },
  {
    value: 50,
    suffix: "+",
    label: "Partner drivers",
    desc: "Verified & background-checked",
  },
  {
    value: 6,
    suffix: "+",
    label: "Vehicle categories",
    desc: "Bikes through heavy trucks",
  },
  {
    value: 4.8,
    suffix: "★",
    label: "Average rating",
    desc: "Across all completed trips",
    isFloat: true,
  },
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
    const duration = 1600;
    const steps = 50;
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
    <span className="tabular-nums">
      {isFloat ? val.toFixed(1) : val.toLocaleString()}
      <span className="text-landing-accent">{suffix}</span>
    </span>
  );
}

export default function LandingStats() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="landing-section relative overflow-hidden bg-[#fafafa]">
      <div className="landing-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: EASE }}
          className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <SectionLabel>Traction</SectionLabel>
            <SectionTitle className="mt-4">
              Numbers that{" "}
              <span className="relative">
                move.
                <span className="absolute -bottom-1 left-0 h-[3px] w-full origin-left scale-x-100 rounded-full bg-landing-accent/60" />
              </span>
            </SectionTitle>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-zinc-500">
            Real metrics from a platform built for daily commuters, businesses,
            and logistics teams.
          </p>
        </motion.div>

        <div
          ref={ref}
          className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5"
        >
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5, ease: EASE }}
              whileHover={{ y: -2 }}
              className="group relative overflow-hidden rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] sm:p-8"
            >
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-landing-accent/0 blur-2xl transition-all duration-500 group-hover:bg-landing-accent/12" />
              <p className="font-display text-4xl font-bold leading-none tracking-tight text-zinc-950 sm:text-5xl">
                <CountUp
                  target={s.value}
                  suffix={s.suffix}
                  isFloat={s.isFloat}
                  start={inView}
                />
              </p>
              <p className="mt-4 text-sm font-semibold text-zinc-900">
                {s.label}
              </p>
              <p className="mt-1 text-xs text-zinc-400">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
