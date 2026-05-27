"use client";

import { RootState } from "@/redux/store";
import { motion, useScroll, useTransform } from "motion/react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { useRef, useEffect, useState } from "react";
import { ArrowRight, MapPin, Zap, Shield } from "lucide-react";

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
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "60%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  // Typewriter effect
  useEffect(() => {
    const word = WORDS[wordIndex];
    let timeout: ReturnType<typeof setTimeout>;
    if (typing) {
      if (displayed.length < word.length) {
        timeout = setTimeout(() => setDisplayed(word.slice(0, displayed.length + 1)), 80);
      } else {
        timeout = setTimeout(() => setTyping(false), 1800);
      }
    } else {
      if (displayed.length > 0) {
        timeout = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 40);
      } else {
        setWordIndex((i) => (i + 1) % WORDS.length);
        setTyping(true);
      }
    }
    return () => clearTimeout(timeout);
  }, [displayed, typing, wordIndex]);

  const handleBook = () => {
    if (status === "loading" && !userData) return;
    if (!isAuthenticated) { onAuthRequired(); return; }
    router.push("/user/book");
  };

  const pills = [
    { icon: Zap, label: "Instant Booking" },
    { icon: Shield, label: "Safe & Verified" },
    { icon: MapPin, label: "Live Tracking" },
  ];

  return (
    <div ref={containerRef} className="relative h-screen min-h-[700px] w-full overflow-hidden">
      {/* Background Image with parallax */}
      <motion.div className="absolute inset-0 scale-110" style={{ y: bgY }}>
        <Image
          src="/heroImage.jpg"
          alt="Rydex hero"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
      </motion.div>

      {/* Layered overlays */}
      <div className="absolute inset-0 bg-linear-to-b from-black/70 via-black/50 to-black/90" />
      <div className="absolute inset-0 bg-linear-to-r from-black/60 via-transparent to-transparent" />

      {/* Animated grain texture */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: "200px 200px",
      }} />

      {/* Content */}
      <motion.div
        style={{ y: textY, opacity }}
        className="relative z-10 h-full flex flex-col items-start justify-center px-6 sm:px-12 md:px-20 max-w-7xl mx-auto"
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-1.5 backdrop-blur-sm" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
          </span>
          <span className="text-xs font-semibold uppercase tracking-widest text-white/80">
            Live Now · 24/7 Available
          </span>
        </motion.div>

        {/* Main headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="text-5xl sm:text-6xl md:text-8xl font-black text-white leading-[0.92] tracking-tight"
        >
          Book
          <br />
          <span className="relative">
            <span className="bg-linear-to-r from-white via-white/90 to-white/60 bg-clip-text text-transparent">
              {displayed}
            </span>
            <span className="animate-pulse text-white/60">|</span>
          </span>
        </motion.h1>

        {/* Sub */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 max-w-md text-base sm:text-lg text-white/55 leading-relaxed"
        >
          From a quick bike ride to heavy cargo trucks — one platform, every vehicle, anywhere.
        </motion.p>

        {/* Pills */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 flex flex-wrap gap-2"
        >
          {pills.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 backdrop-blur-sm" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
            >
              <Icon size={12} className="text-white/60" />
              <span className="text-xs font-medium text-white/60">{label}</span>
            </div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 flex items-center gap-4"
        >
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            disabled={status === "loading" && !userData}
            onClick={handleBook}  
            className="group relative flex items-center gap-3 overflow-hidden rounded-full bg-white px-8 py-4 text-sm font-bold text-black shadow-[0_0_40px_rgba(255,255,255,0.2)] transition-shadow hover:shadow-[0_0_60px_rgba(255,255,255,0.35)] disabled:opacity-60"
          >
            <span>Book a Ride</span>
            <ArrowRight
              size={16}
              className="transition-transform duration-300 group-hover:translate-x-1"
            />
            {/* shine sweep */}
            <motion.span
              className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/20 to-transparent skew-x-12"
              animate={{ x: ["−100%", "200%"] }}
              transition={{ repeat: Infinity, duration: 2.5, repeatDelay: 1.5, ease: "easeInOut" }}
            />
          </motion.button>

          <motion.a
            href="/about"
            whileHover={{ x: 4 }}
            className="flex items-center gap-2 text-sm font-semibold text-white/50 hover:text-white transition-colors"
          >
            Learn More
            <ArrowRight size={14} />
          </motion.a>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        style={{ opacity }}
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/30">
          Scroll
        </span>
        <div className="h-10 w-[1px] bg-linear-to-b from-white/30 to-transparent" />
      </motion.div>
    </div>
  );
}

export default HeroSection;
