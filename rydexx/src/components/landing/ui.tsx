"use client";

import { motion, type Variants } from "motion/react";
import { type ReactNode } from "react";

export const EASE = [0.16, 1, 0.3, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: EASE },
  },
};

export const stagger: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.06 },
  },
};

export function SectionLabel({
  children,
  light,
}: {
  children: ReactNode;
  light?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`h-px w-10 ${light ? "bg-white/25" : "bg-zinc-300"}`}
        aria-hidden
      />
      <span
        className={`font-mono text-[10px] font-semibold uppercase tracking-[0.28em] ${
          light ? "text-white/40" : "text-zinc-400"
        }`}
      >
        {children}
      </span>
    </div>
  );
}

export function SectionTitle({
  children,
  subtitle,
  light,
  className = "",
}: {
  children: ReactNode;
  subtitle?: ReactNode;
  light?: boolean;
  className?: string;
}) {
  return (
    <div className={`space-y-4 ${className}`}>
      <h2
        className={`font-display text-4xl font-bold leading-[1.05] tracking-[-0.03em] sm:text-5xl lg:text-[3.25rem] ${
          light ? "text-white" : "text-zinc-950"
        }`}
      >
        {children}
      </h2>
      {subtitle && (
        <p
          className={`max-w-md text-base leading-relaxed ${
            light ? "text-white/45" : "text-zinc-500"
          }`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

export function GradientMesh({ className = "" }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden
    >
      <div className="absolute -left-[20%] top-[10%] h-[50%] w-[55%] rounded-full bg-[#9eff6b]/12 blur-[100px]" />
      <div className="absolute -right-[10%] bottom-[5%] h-[45%] w-[45%] rounded-full bg-emerald-400/8 blur-[90px]" />
      <div className="absolute left-[35%] top-[45%] h-[30%] w-[35%] rounded-full bg-white/5 blur-[80px]" />
    </div>
  );
}

export function GridPattern({ light }: { light?: boolean }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.35]"
      style={{
        backgroundImage: light
          ? `linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)`
          : `linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)`,
        backgroundSize: "64px 64px",
        maskImage:
          "radial-gradient(ellipse 70% 60% at 50% 40%, black 20%, transparent 75%)",
      }}
      aria-hidden
    />
  );
}

export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={{
        hidden: { opacity: 0, y: 24 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.6, delay, ease: EASE },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  variant = "light",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "light" | "dark";
  className?: string;
}) {
  const base =
    variant === "light"
      ? "bg-white text-zinc-950 shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_12px_40px_rgba(0,0,0,0.35)] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.15),0_16px_50px_rgba(0,0,0,0.45)]"
      : "bg-zinc-950 text-white shadow-[0_8px_30px_rgba(0,0,0,0.2)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.28)]";

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.98 }}
      disabled={disabled}
      onClick={onClick}
      className={`group relative inline-flex items-center justify-center gap-2.5 overflow-hidden rounded-full px-7 py-3.5 text-sm font-semibold transition-shadow disabled:opacity-50 ${base} ${className}`}
    >
      {children}
    </motion.button>
  );
}
