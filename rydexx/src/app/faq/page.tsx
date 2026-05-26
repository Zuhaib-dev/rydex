"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, ChevronDown, ChevronUp, Sparkles, Users, HelpCircle as HelpIcon } from "lucide-react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export default function FAQPage() {
  const [activeCategory, setActiveCategory] = useState<"passenger" | "partner">("passenger");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const passengerFaq = [
    {
      q: "How do I book a ride with Rydex?",
      a: "Simply sign in on our platform, navigate to the Booking section, enter your pickup and dropoff addresses, select your preferred vehicle tier (Bike, Car, Bus, or Truck), and checkout securely via Stripe or Razorpay. Our socket engine will pair you with the closest driver instantly.",
    },
    {
      q: "Are the payments secure on this platform?",
      a: "Yes. All monetary actions are protected via our dual-gateway payment integration. Stripe secures international credit cards, and Razorpay handles domestic Indian transactions (including UPI, NetBanking, and Wallets) utilizing 256-bit encryption standards.",
    },
    {
      q: "Can I cancel a ride after booking?",
      a: "Yes. Ride cancellations can be triggered from your active ride dashboard. If a driver has not started moving, cancellations are entirely free of cost. Tardy cancellations might carry a small dispatcher penalty fee.",
    },
    {
      q: "How can I contact my assigned driver?",
      a: "Once a driver accepts your booking, a high-intensity chat engine becomes available on your screen. You can chat instantly or find their direct telephone contact number on your booking receipt card.",
    },
  ];

  const partnerFaq = [
    {
      q: "What is the Video KYC verification process?",
      a: "To ensure absolute platform integrity, all driver-partners must complete a quick video KYC onboarding. Powered by ZegoCloud, this allows you to speak to a dispatcher live or record an identification prompt displaying your license credentials.",
    },
    {
      q: "How is the ride start OTP validated?",
      a: "Rydex maintains strict ride security. When you arrive at the passenger's pickup spot, they must give you a secret 4-digit OTP from their screen. Inputting this OTP on your partner dashboard is mandatory to start the ride.",
    },
    {
      q: "How often are driver earnings settled?",
      a: "Earnings are computed dynamically and visual trends are presented in real-time on your dashboard chart. Settlements are processed weekly directly to the bank account registered during your onboarding phase.",
    },
    {
      q: "Are there vehicle age requirements to become a partner?",
      a: "Yes. Motorcycles, sedans, shuttles, and transport trucks must satisfy registration criteria and are verified by our admin crew. Vehicles must have active insurance cards and be manufactured within the last 8 years.",
    },
  ];

  const currentFaq = activeCategory === "passenger" ? passengerFaq : partnerFaq;

  const toggleIndex = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="w-full min-h-screen bg-[#060606] text-white">
      <Nav />

      {/* Hero */}
      <section className="relative pt-36 pb-12 px-4 md:px-8 text-center overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] md:w-[600px] md:h-[600px] bg-blue-600/10 rounded-full blur-[100px] -z-10" />

        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-xs font-semibold text-blue-400 mb-6"
          >
            <HelpCircle size={14} />
            <span>Support Hub</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-400"
          >
            Frequently Asked Questions
          </motion.h1>
          <p className="text-neutral-400 text-sm md:text-base mt-4 max-w-lg mx-auto leading-relaxed">
            Quick, comprehensive answers detailing dispatch telemetry, payments, partner onboarding, and cancellation policies.
          </p>
        </div>
      </section>

      {/* Category Toggle */}
      <section className="py-6 px-4 md:px-8 max-w-md mx-auto">
        <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
          <button
            onClick={() => {
              setActiveCategory("passenger");
              setOpenIndex(null);
            }}
            className={`py-3 rounded-xl font-bold text-xs md:text-sm flex items-center justify-center gap-2 transition-all ${
              activeCategory === "passenger"
                ? "bg-white text-black shadow-lg"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Sparkles size={14} />
            <span>Passenger Care</span>
          </button>

          <button
            onClick={() => {
              setActiveCategory("partner");
              setOpenIndex(null);
            }}
            className={`py-3 rounded-xl font-bold text-xs md:text-sm flex items-center justify-center gap-2 transition-all ${
              activeCategory === "partner"
                ? "bg-white text-black shadow-lg"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Users size={14} />
            <span>Partner Hub</span>
          </button>
        </div>
      </section>

      {/* Accordion List */}
      <section className="py-12 pb-24 px-4 md:px-8 max-w-3xl mx-auto">
        <div className="space-y-4">
          {currentFaq.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <motion.div
                key={faq.q}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="rounded-2xl border border-white/5 bg-white/[0.01] backdrop-blur-2xl overflow-hidden hover:border-white/10 transition-all duration-300"
              >
                {/* Header button */}
                <button
                  onClick={() => toggleIndex(index)}
                  className="w-full p-6 text-left flex items-center justify-between gap-4 font-bold text-sm md:text-base text-white hover:text-blue-400 transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <HelpIcon size={16} className="text-blue-400 shrink-0" />
                    {faq.q}
                  </span>
                  {isOpen ? (
                    <ChevronUp size={16} className="text-neutral-500 shrink-0" />
                  ) : (
                    <ChevronDown size={16} className="text-neutral-500 shrink-0" />
                  )}
                </button>

                {/* Animated expandable content */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="border-t border-white/5 bg-white/[0.01]"
                    >
                      <p className="p-6 text-neutral-400 text-xs md:text-sm leading-relaxed">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </section>

      <Footer />
    </div>
  );
}
