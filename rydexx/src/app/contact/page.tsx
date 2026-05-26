"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Phone, MapPin, Send, CheckCircle2, AlertCircle } from "lucide-react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      setStatus("error");
      return;
    }
    setIsSubmitting(true);
    setStatus("idle");
    
    // Simulate API request delay
    setTimeout(() => {
      setIsSubmitting(false);
      setStatus("success");
      setFormData({ name: "", email: "", subject: "", message: "" });
    }, 1500);
  };

  const contactDetails = [
    {
      title: "Email Support",
      value: "support@rydexx.com",
      desc: "For general queries, billing assistance, and partnership options.",
      icon: Mail,
    },
    {
      title: "Phone Assistance",
      value: "+1 (800) 555-RYDEX",
      desc: "Mon - Fri, 9:00 AM - 6:00 PM EST. High priority booking assistance.",
      icon: Phone,
    },
    {
      title: "Global Headquarters",
      value: "100 Innovation Parkway, Suite 500, Tech City, TC 94043",
      desc: "Our primary corporate office and development center.",
      icon: MapPin,
    },
  ];

  return (
    <div className="w-full min-h-screen bg-[#060606] text-white">
      <Nav />

      {/* Header Banner */}
      <section className="relative pt-36 pb-12 px-4 md:px-8 text-center overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] md:w-[600px] md:h-[600px] bg-blue-600/10 rounded-full blur-[100px] -z-10" />
        
        <div className="max-w-3xl mx-auto">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-400"
          >
            Get In Touch
          </motion.h1>
          <p className="text-neutral-400 text-sm md:text-base mt-4 max-w-lg mx-auto leading-relaxed">
            Have questions about bookings, driver verification, or cargo scaling? Reach out, and our dispatchers will respond in no time.
          </p>
        </div>
      </section>

      {/* Main Grid */}
      <section className="py-12 pb-24 px-4 md:px-8 max-w-6xl mx-auto grid md:grid-cols-12 gap-12 relative">
        
        {/* Contact Info (5 Cols) */}
        <div className="md:col-span-5 space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            {contactDetails.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="p-6 rounded-2xl border border-white/5 bg-white/[0.01] backdrop-blur-md flex gap-4 hover:border-white/10 transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                    <Icon size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">{item.title}</h3>
                    <p className="text-blue-400 font-semibold text-sm mt-1">{item.value}</p>
                    <p className="text-neutral-500 text-xs mt-1.5 leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Interactive Interactive Maps Panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="p-6 rounded-2xl border border-white/5 bg-white/[0.01] backdrop-blur-md overflow-hidden relative"
          >
            <h3 className="font-bold text-white text-sm mb-3">Live Dispatch Map Hub</h3>
            <div className="w-full h-36 rounded-xl bg-neutral-900 border border-white/10 flex flex-col items-center justify-center p-4 text-center relative overflow-hidden">
              {/* Mock Leaflet Grid background */}
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
              <div className="absolute w-2 h-2 bg-blue-500 rounded-full animate-ping" />
              <div className="absolute w-2 h-2 bg-blue-500 rounded-full" />
              
              <p className="text-xs text-neutral-400 font-medium z-10">Headquarters Active Monitoring Node</p>
              <p className="text-[10px] text-neutral-500 mt-1 font-mono z-10">37.4043° N, 122.0083° W</p>
              <span className="mt-3 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] uppercase font-bold z-10">Active Telemetry</span>
            </div>
          </motion.div>
        </div>

        {/* Contact Form (7 Cols) */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="md:col-span-7 p-8 rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-2xl shadow-xl flex flex-col justify-between"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-2">Send us a message</h2>
            
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Your Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Zuhaib Rashid"
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500 focus:bg-white/[0.08] transition-all"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Email Address *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="name@domain.com"
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500 focus:bg-white/[0.08] transition-all"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Subject</label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Enterprise cargo scaling or partnerships"
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500 focus:bg-white/[0.08] transition-all"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Message *</label>
              <textarea
                required
                rows={5}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Enter details on vehicle availability, bookings, or dashboard concerns..."
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500 focus:bg-white/[0.08] transition-all resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-xl bg-white text-black font-bold text-sm shadow-lg flex items-center justify-center gap-2 hover:scale-[1.01] hover:bg-neutral-100 disabled:opacity-50 transition-all duration-300"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send size={16} />
                  <span>Send Message</span>
                </>
              )}
            </button>
          </form>

          {/* Form status alerts */}
          <div className="mt-6">
            <AnimatePresence mode="wait">
              {status === "success" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 flex items-start gap-3"
                >
                  <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm">Message Sent Successfully!</h4>
                    <p className="text-xs text-emerald-400/80 mt-1">Thank you. Our dispatcher team will review and reply within 12 hours.</p>
                  </div>
                </motion.div>
              )}

              {status === "error" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 flex items-start gap-3"
                >
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm">Submission Error</h4>
                    <p className="text-xs text-rose-400/80 mt-1">Please fill in all required fields (Name, Email, Message) before sending.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
