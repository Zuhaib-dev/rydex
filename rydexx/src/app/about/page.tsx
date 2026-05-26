"use client";

import React from "react";
import { motion } from "framer-motion";
import { Shield, Sparkles, Users, Award, TrendingUp, Compass } from "lucide-react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

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
    <div className="w-full min-h-screen bg-[#060606] text-white select-none">
      <Nav />

      {/* Hero Section */}
      <section className="relative pt-36 pb-20 px-4 md:px-8 text-center overflow-hidden">
        {/* Background ambient lights */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] md:w-[600px] md:h-[600px] bg-blue-600/10 rounded-full blur-[100px] -z-10" />
        <div className="absolute top-1/3 left-1/4 w-[250px] h-[250px] bg-purple-600/10 rounded-full blur-[80px] -z-10" />

        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-xs font-semibold text-blue-400 mb-6"
          >
            <Sparkles size={14} />
            <span>Discover Rydex</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-4xl md:text-7xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-neutral-200 to-neutral-400 leading-tight"
          >
            Revolutionizing Logistics &amp; Travel
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-6 text-base md:text-xl text-neutral-400 max-w-2xl mx-auto leading-relaxed"
          >
            Rydex is the world's most premium multi-vehicle logistics aggregator. 
            We build zero-friction coordinate paths to transport everything from simple commutes to industrial freighter cargo.
          </motion.p>
        </div>
      </section>

      {/* Stats Counter Section */}
      <section className="py-16 px-4 md:px-8 border-y border-white/5 bg-white/[0.01]">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
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
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-blue-400 mb-4 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                  <Icon size={20} />
                </div>
                <span className="text-3xl md:text-5xl font-black text-white tracking-tight">{stat.value}</span>
                <span className="text-xs md:text-sm text-neutral-500 font-medium mt-2 uppercase tracking-widest">{stat.label}</span>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Values Section */}
      <section className="py-24 px-4 md:px-8 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">Our Core Pillars</h2>
          <p className="text-neutral-400 text-sm md:text-base mt-4 max-w-lg mx-auto">
            We operate on uncompromising reliability parameters, securing every ride checkpoint.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {values.map((v, i) => {
            const Icon = v.icon;
            return (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                className="p-8 rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-2xl hover:border-white/20 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-300">
                  <Icon size={22} />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors">{v.title}</h3>
                <p className="text-neutral-400 text-sm leading-relaxed">{v.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Brand CTA */}
      <section className="py-24 px-4 md:px-8 relative text-center border-t border-white/5">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-purple-600/10 rounded-full blur-[100px] -z-10" />
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-6xl font-extrabold tracking-tight">Ready to hit the road?</h2>
          <p className="text-neutral-400 text-sm md:text-base mt-4 max-w-md mx-auto leading-relaxed">
            Register as a partner driver or get instant pickup options with the ultimate multi-vehicle scheduler.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => window.location.href = "/"}
              className="w-full sm:w-auto px-8 py-3.5 bg-white text-black font-bold rounded-full shadow-lg hover:scale-105 hover:bg-neutral-100 transition-all duration-300"
            >
              Book Now
            </button>
            <button
              onClick={() => window.location.href = "/partner/onboarding/vehicle"}
              className="w-full sm:w-auto px-8 py-3.5 bg-[#121212] border border-white/10 text-white font-bold rounded-full hover:bg-white/5 transition-all duration-300"
            >
              Become a Partner
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
