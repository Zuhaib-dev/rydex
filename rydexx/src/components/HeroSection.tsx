"use client";

import { RootState } from "@/redux/store";
import { motion, useScroll, useTransform } from "motion/react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { useRef, useEffect, useState } from "react";
import {
  ArrowRight,
  MapPin,
  Zap,
  Shield,
  Navigation,
  Clock,
  Car,
} from "lucide-react";
import { EASE, GradientMesh, PrimaryButton } from "./landing/ui";

const WORDS = ["Any Vehicle", "Any Distance", "Any Time", "Your Way"];

function HeroSection({ onAuthRequired }: { onAuthRequired: () => void }) {
  const { userData } = useSelector((state: RootState) => state.user);
  const { status } = useSession();
  const router = useRouter();
  const isAuthenticated = status === "authenticated" || !!userData;
  const containerRef = useRef<HTMLDivElement>(null);

  const [wordIndex, setWordIndex] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [typing, setTyping] = useState(true);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "22%"]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "35%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const cardRotate = useTransform(scrollYProgress, [0, 1], [0, 8]);

  useEffect(() => {
    const word = WORDS[wordIndex];
    let timeout: ReturnType<typeof setTimeout>;
    if (typing) {
      if (displayed.length < word.length) {
        timeout = setTimeout(
          () => setDisplayed(word.slice(0, displayed.length + 1)),
          72
        );
      } else {
        timeout = setTimeout(() => setTyping(false), 2000);
      }
    } else if (displayed.length > 0) {
      timeout = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 36);
    } else {
      setWordIndex((i) => (i + 1) % WORDS.length);
      setTyping(true);
    }
    return () => clearTimeout(timeout);
  }, [displayed, typing, wordIndex]);

  const handleBook = () => {
    if (status === "loading" && !userData) return;
    if (!isAuthenticated) {
      onAuthRequired();
      return;
    }
    router.push("/user/book");
  };

  const pills = [
    { icon: Zap, label: "Instant matching" },
    { icon: Shield, label: "Verified drivers" },
    { icon: MapPin, label: "Live tracking" },
  ];

  return (
    <div
      ref={containerRef}
      className="relative min-h-[100svh] w-full overflow-hidden bg-landing-bg"
    >
      {/* Background */}
      <motion.div className="absolute inset-0 scale-105" style={{ y: bgY }}>
        <Image
          src="/heroImage.jpg"
          alt="City streets at night"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
      </motion.div>

      <div className="absolute inset-0 bg-linear-to-b from-[#060608]/85 via-[#060608]/55 to-landing-bg" />
      <div className="absolute inset-0 bg-linear-to-r from-[#060608]/80 via-[#060608]/25 to-transparent" />
      <GradientMesh />
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "200px 200px",
        }}
        aria-hidden
      />

      <motion.div
        style={{ y: contentY, opacity }}
        className="relative z-10 mx-auto flex min-h-[100svh] max-w-7xl flex-col justify-center px-4 pb-28 pt-28 sm:px-8 lg:px-10"
      >
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          {/* Copy */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: EASE }}
              className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 backdrop-blur-md"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-landing-accent opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-landing-accent" />
              </span>
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-white/70">
                Live · 24/7 across the city
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.08, ease: EASE }}
              className="font-display text-[2.75rem] font-bold leading-[0.95] tracking-[-0.04em] text-white sm:text-6xl md:text-7xl lg:text-[4.5rem]"
            >
              Move on
              <br />
              your terms.
              <br />
              <span className="text-accent-gradient">
                {displayed}
                <span className="ml-0.5 inline-block w-[3px] animate-pulse bg-landing-accent/80 align-middle" style={{ height: "0.85em" }} />
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.2, ease: EASE }}
              className="mt-6 max-w-lg text-base leading-relaxed text-white/50 sm:text-lg"
            >
              From a quick bike hop to heavy cargo — one platform, every vehicle,
              matched in seconds with live tracking and secure checkout.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.32, ease: EASE }}
              className="mt-7 flex flex-wrap gap-2"
            >
              {pills.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/55 backdrop-blur-sm"
                >
                  <Icon size={12} className="text-landing-accent" />
                  {label}
                </span>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.42, ease: EASE }}
              className="mt-10 flex flex-wrap items-center gap-4 sm:gap-5"
            >
              <PrimaryButton
                onClick={handleBook}
                disabled={status === "loading" && !userData}
                className="!px-8 !py-4"
              >
                Book a ride
                <ArrowRight
                  size={16}
                  className="transition-transform duration-300 group-hover:translate-x-0.5"
                />
              </PrimaryButton>

              <motion.a
                href="/fleet"
                whileHover={{ x: 3 }}
                className="inline-flex items-center gap-2 text-sm font-semibold text-white/45 transition-colors hover:text-white"
              >
                Explore fleet
                <ArrowRight size={14} />
              </motion.a>
            </motion.div>
          </div>

          {/* Floating booking preview */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.75, delay: 0.35, ease: EASE }}
            style={{ rotate: cardRotate }}
            className="relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-none"
          >
            <div className="absolute -inset-4 rounded-[2rem] bg-landing-accent/10 blur-2xl" aria-hidden />
            <div className="glass-dark relative overflow-hidden rounded-3xl p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">
                    Live preview
                  </p>
                  <p className="mt-1 font-display text-lg font-semibold text-white">
                    Trip in progress
                  </p>
                </div>
                <span className="rounded-full bg-landing-accent/15 px-3 py-1 text-xs font-semibold text-landing-accent">
                  En route
                </span>
              </div>

              <div className="relative mb-5 h-36 overflow-hidden rounded-2xl bg-white/[0.04]">
                <div className="absolute inset-0 bg-linear-to-br from-landing-accent/10 via-transparent to-emerald-500/5" />
                <svg
                  className="absolute inset-0 h-full w-full text-white/15"
                  viewBox="0 0 320 144"
                  preserveAspectRatio="none"
                  aria-hidden
                >
                  <path
                    d="M20 100 Q80 40 140 70 T280 50"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeDasharray="6 8"
                  />
                </svg>
                <motion.div
                  animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.2, 0.5] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute left-[42%] top-[38%] h-12 w-12 rounded-full bg-landing-accent/25"
                />
                <div className="absolute left-[42%] top-[38%] flex h-12 w-12 items-center justify-center">
                  <span className="flex h-3 w-3 rounded-full bg-landing-accent shadow-[0_0_20px_#9eff6b]" />
                </div>
                <div className="absolute bottom-3 left-3 right-3 flex justify-between text-[10px] font-medium text-white/40">
                  <span>Pickup · 2 min ago</span>
                  <span className="text-landing-accent">ETA 54 min</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-xl bg-white/[0.03] p-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-landing-accent/15 text-landing-accent">
                    <Navigation size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-white/35">
                      Pickup
                    </p>
                    <p className="truncate text-sm font-medium text-white/90">
                      Dal Lake, Srinagar
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl bg-white/[0.03] p-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-white/70">
                    <MapPin size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-white/35">
                      Drop-off
                    </p>
                    <p className="truncate text-sm font-medium text-white/90">
                      Gulmarg Hill Station
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-4">
                <div className="flex items-center gap-2 text-sm text-white/50">
                  <Car size={16} className="text-landing-accent" />
                  <span>SUV · Premium</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm font-semibold text-white">
                  <Clock size={14} className="text-landing-accent" />
                  ₹1,840
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1, duration: 0.5 }}
        style={{ opacity }}
        className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2"
      >
        <span className="font-mono text-[9px] uppercase tracking-[0.35em] text-white/25">
          Scroll
        </span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="h-9 w-px bg-linear-to-b from-white/40 to-transparent"
        />
      </motion.div>
    </div>
  );
}

export default HeroSection;
