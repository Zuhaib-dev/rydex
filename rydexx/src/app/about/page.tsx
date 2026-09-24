"use client";

import React from "react";
import { motion } from "framer-motion";
import { Shield, Sparkles, Users, Award, TrendingUp, Compass, Asterisk, ArrowUpRight } from "lucide-react";
import Nav from "@/components/landing/sections/Nav";
import Foot from "@/components/landing/sections/Foot";

export default function AboutPage() {
  const stats = [
    { label: "Successful Rides", value: "500K+", icon: TrendingUp },
    { label: "Verified Drivers", value: "12K+", icon: Users },
    { label: "Active Cities", value: "45+", icon: Compass },
    { label: "Quality Rating", value: "4.9/5", icon: Award },
  ];

  const values = [
    {
      title: "Safety First",
      desc: "Comprehensive driver screening, real-time live ride telemetry, secure OTP validation, and video-based KYC checkins.",
      icon: Shield,
    },
    {
      title: "Premium Aesthetics",
      desc: "Crafted with cutting-edge visual layers and buttery smooth fluid animation paths for the ultimate user booking flows.",
      icon: Sparkles,
    },
    {
      title: "Reliability & Speed",
      desc: "Powered by a high-intensity, dedicated real-time socket-server routing rides in milliseconds with zero latency.",
      icon: Users,
    },
  ];

  return (
    <div className="facelift-landing min-h-screen overflow-x-hidden flex flex-col">
      <Nav onAuthRequired={() => {}} />

      <main className="flex-1 relative z-10">
        {/* Background Grid */}
        <div
          className="absolute inset-0 opacity-20 mix-blend-multiply pointer-events-none -z-10"
          style={{
            backgroundImage:
              "linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* Hero Section */}
        <section className="relative pt-36 pb-20 px-6 md:px-12 text-center max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 mb-8 font-mono text-[11px] tracking-[0.25em] uppercase text-signal"
          >
            <Asterisk className="w-3 h-3" />
            <span>Discover Rydex</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="font-serif text-[48px] md:text-[80px] lg:text-[96px] font-black leading-[0.9] tracking-tighter text-ink"
          >
            Revolutionizing Logistics &amp; Travel.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-8 text-sm md:text-base font-mono tracking-widest text-muted-foreground max-w-2xl mx-auto leading-relaxed uppercase"
          >
            Rydex is the world's most premium multi-vehicle logistics aggregator. 
            We build zero-friction coordinate paths to transport everything from simple commutes to industrial freighter cargo.
          </motion.p>
        </section>

        {/* Stats Section */}
        <section className="py-16 px-6 md:px-12 border-y border-border bg-secondary/50">
          <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="text-center flex flex-col items-center"
                >
                  <div className="w-12 h-12 rounded-full border border-border bg-background flex items-center justify-center text-signal mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="font-serif text-[32px] md:text-[48px] font-black text-ink tracking-tighter leading-none">{stat.value}</span>
                  <span className="font-mono text-[10px] text-muted-foreground mt-3 uppercase tracking-[0.2em]">{stat.label}</span>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Values Section */}
        <section className="py-24 px-6 md:px-12 max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-serif text-[40px] md:text-[56px] font-black text-ink tracking-tighter leading-[0.95]">
              Our Core Pillars
            </h2>
            <p className="font-mono text-[11px] md:text-[12px] uppercase tracking-[0.15em] text-muted-foreground mt-6 max-w-xl mx-auto">
              We operate on uncompromising reliability parameters, securing every ride checkpoint.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {values.map((v, i) => {
              const Icon = v.icon;
              return (
                <motion.div
                  key={v.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.15 }}
                  className="p-8 hairline bg-background hover:bg-secondary transition-colors group flex flex-col h-full"
                >
                  <div className="w-12 h-12 rounded-full border border-border bg-secondary text-ink flex items-center justify-center mb-6 group-hover:text-signal group-hover:border-signal/30 transition-all duration-300">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-serif text-[24px] font-black text-ink tracking-tight mb-4">{v.title}</h3>
                  <p className="font-mono text-[11px] text-muted-foreground leading-relaxed uppercase tracking-wider">{v.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Brand CTA */}
        <section className="py-24 px-6 md:px-12 text-center border-t border-border bg-secondary/30">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-serif text-[48px] md:text-[72px] font-black tracking-tighter text-ink leading-[0.9]">
              Ready to hit the road?
            </h2>
            <p className="font-mono text-[11px] md:text-[12px] uppercase tracking-[0.15em] text-muted-foreground mt-6 max-w-lg mx-auto leading-relaxed">
              Register as a partner driver or get instant pickup options with the ultimate multi-vehicle scheduler.
            </p>
            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => window.location.href = "/"}
                className="w-full sm:w-auto px-8 py-4 brick bg-ink text-bone hover:bg-ink/90 transition-colors font-mono text-[11px] tracking-[0.22em] uppercase flex items-center justify-center gap-2"
              >
                Book Now
                <ArrowUpRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => window.location.href = "/partner/onboarding/vehicle"}
                className="w-full sm:w-auto px-8 py-4 hairline bg-background text-ink hover:bg-secondary transition-colors font-mono text-[11px] tracking-[0.22em] uppercase flex items-center justify-center gap-2"
              >
                Become a Partner
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      </main>

      <Foot />
    </div>
  );
}
