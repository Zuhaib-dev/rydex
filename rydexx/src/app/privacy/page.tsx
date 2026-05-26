"use client";

import React from "react";
import { motion } from "framer-motion";
import { ShieldAlert, Fingerprint, Eye, Database } from "lucide-react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export default function PrivacyPage() {
  const sections = [
    {
      title: "1. Information We Collect",
      icon: Database,
      content:
        "We gather data to secure ride pairings and process transactions. This includes personal profile details (Name, Email, Phone), precise real-time geolocation telemetry (necessary to project map positions), payment parameters (handled directly via Stripe and Razorpay), and KYC verification media.",
    },
    {
      title: "2. Geolocation Telemetry Usage",
      icon: ShieldAlert,
      content:
        "Rydex logs active driver latitude and longitude data. This coordinate streaming allows passengers to see vehicles arriving, determines dynamic base fare multipliers, and maintains secure tracking metrics. Location coordinates are strictly encrypted in transit.",
    },
    {
      title: "3. Third-Party Integrations",
      icon: Fingerprint,
      content:
        "We connect with secured industry-leading partners: Stripe and Razorpay for payment checkouts, Cloudinary for driver license file hosting, and ZegoCloud for encrypted live audio/video streams during partner onboarding validation procedures.",
    },
    {
      title: "4. Your Rights & GDPR Compliance",
      icon: Eye,
      content:
        "In accordance with modern data privacy frameworks (GDPR and CCPA), you reserve full autonomy to view, download, restrict processing, or request complete removal of your platform credentials at any time. Direct deletion requests can be coordinated through support.",
    },
  ];

  return (
    <div className="w-full min-h-screen bg-[#060606] text-white">
      <Nav />

      {/* Header */}
      <section className="relative pt-36 pb-12 px-4 md:px-8 text-center overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-blue-600/10 rounded-full blur-[100px] -z-10" />

        <div className="max-w-3xl mx-auto">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-linear-to-r from-white to-neutral-400"
          >
            Privacy Principles
          </motion.h1>
          <p className="text-neutral-400 text-xs md:text-sm mt-4 max-w-lg mx-auto leading-relaxed">
            Effective Date: May 26, 2026. This policy outlines how Rydex collects, guards, and orchestrates user data across our platform.
          </p>
        </div>
      </section>

      {/* Content Document */}
      <section className="py-12 pb-24 px-4 md:px-8 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="p-8 md:p-12 rounded-3xl border border-white/10 bg-white/1 backdrop-blur-2xl space-y-8"
        >
          {sections.map((sec, i) => {
            const Icon = sec.icon;
            return (
              <div key={sec.title} className="space-y-4">
                <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-3">
                  <Icon size={18} className="text-blue-400" />
                  {sec.title}
                </h2>
                <p className="text-neutral-400 text-xs md:text-sm leading-relaxed pl-7">
                  {sec.content}
                </p>
                {i < sections.length - 1 && <div className="border-b border-white/5 pt-4" />}
              </div>
            );
          })}
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
