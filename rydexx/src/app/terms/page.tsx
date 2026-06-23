"use client";

import React from "react";
import { motion } from "framer-motion";
import { Gavel, DollarSign, UserCheck, ShieldAlert } from "lucide-react";
import Nav from "@/components/landing/sections/Nav";
import Foot from "@/components/landing/sections/Foot";

export default function TermsPage() {
  const sections = [
    {
      title: "1. Acceptance of Terms",
      icon: Gavel,
      content:
        "By accessing or utilizing Rydex, you implicitly agree to comply with our Terms of Service, security declarations, and billing policies. If you do not align with these conditions, you must refrain from creating bookings or registering driver telemetry.",
    },
    {
      title: "2. User Conduct & Accounts",
      icon: UserCheck,
      content:
        "Users are responsible for safeguarding their authentication details (NextAuth keys). Driver-partners must supply completely valid, unexpired licensing credentials and undergo required Video KYC approvals. Impersonation of another passenger or driver is grounds for immediate termination.",
    },
    {
      title: "3. Fare structures & Disbursements",
      icon: DollarSign,
      content:
        "Pricing parameters are derived dynamically based on vehicle category selections (Bikes, Cars, Buses, Trucks) and GPS route mileage estimations. Charges are processed instantly via integrated Stripe and Razorpay systems. Driver disbursements are computed weekly and transferred directly to the designated bank account.",
    },
    {
      title: "4. Limitations of Liabilities",
      icon: ShieldAlert,
      content:
        "Rydex is a technology aggregator that pairs users with logistics providers. We carry out extreme diligence screening drivers via ZegoCloud KYC vectors. However, we do not directly operate vehicles and do not hold liability for route delays or freight damage incidents.",
    },
  ];

  return (
    <div className="w-full min-h-screen bg-[#060606] text-white">
      <Nav onAuthRequired={() => {}} />

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
            Terms of Service
          </motion.h1>
          <p className="text-neutral-400 text-xs md:text-sm mt-4 max-w-lg mx-auto leading-relaxed">
            Effective Date: May 26, 2026. This document governs user code of conduct, payment parameters, and dispatcher liabilities.
          </p>
        </div>
      </section>

      {/* Document Panel */}
      <section className="py-12 pb-24 px-4 md:px-8 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="p-8 md:p-12 rounded-3xl border border-white/10 bg-white/2 backdrop-blur-2xl space-y-8"
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

      <Foot />
    </div>
  );
}
