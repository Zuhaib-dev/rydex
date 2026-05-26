"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bike, Car, Bus, Truck, ShieldAlert, Zap, Dumbbell, IndianRupee } from "lucide-react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export default function FleetPage() {
  const [activeTab, setActiveTab] = useState<"bike" | "car" | "bus" | "truck">("bike");

  const fleet = {
    bike: {
      title: "Rydex Moto",
      icon: Bike,
      badge: "Fastest Commutes",
      desc: "Perfect for slicing through city rush hours, getting to meetings on time, or taking single passenger runs with absolute agility.",
      baseFare: 10,
      perKm: 5,
      capacity: "1 Passenger",
      specs: [
        { label: "Traffic Slicing Speed", value: "High", icon: Zap },
        { label: "Carbon Footprint", value: "Ultra Low", icon: Dumbbell },
        { label: "Optimal Range", value: "0 - 15 KM", icon: ShieldAlert },
      ],
      types: ["Electric Scooter", "150cc Sports Commuter", "Premium Cruiser"],
    },
    car: {
      title: "Rydex Cab",
      icon: Car,
      badge: "Premium Comfort",
      desc: "Travel in air-conditioned comfort. Ideal for family outings, airport transfers, business runs, or daily office commutes.",
      baseFare: 50,
      perKm: 12,
      capacity: "4 - 7 Passengers",
      specs: [
        { label: "Ride Comfort Index", value: "Maximum", icon: Zap },
        { label: "AC Status", value: "Dual Zone climate", icon: Dumbbell },
        { label: "Luggage Space", value: "3 - 5 Suitcases", icon: ShieldAlert },
      ],
      types: ["Compact Hatchback", "Luxury Sedan", "7-Seater Premium SUV"],
    },
    bus: {
      title: "Rydex Shuttle",
      icon: Bus,
      badge: "Group Expeditions",
      desc: "Coordinating corporate transfers, wedding parties, or weekend retreats? Book a multi-passenger shuttle for everyone in comfort.",
      baseFare: 250,
      perKm: 35,
      capacity: "15 - 45 Passengers",
      specs: [
        { label: "Group Boarding", value: "High volume", icon: Zap },
        { label: "Entertainment", value: "Built-in Screens", icon: Dumbbell },
        { label: "Comfort Level", value: "Recliner Seats", icon: ShieldAlert },
      ],
      types: ["15-Seater Mini Traveler", "25-Seater Executive Coach", "45-Seater sleeper Bus"],
    },
    truck: {
      title: "Rydex Logistics",
      icon: Truck,
      badge: "Heavy Duty Freight",
      desc: "Constructed for high-payload cargo transfers, furniture shifts, factory shipments, or cross-country distribution networks.",
      baseFare: 800,
      perKm: 65,
      capacity: "Up to 15 Tons",
      specs: [
        { label: "Load Capacity", value: "5 - 15 Tons", icon: Zap },
        { label: "Container Types", value: "Open / Closed Cabin", icon: Dumbbell },
        { label: "Telemetry", value: "Geo-tracked lockbox", icon: ShieldAlert },
      ],
      types: ["8ft Commuter Pickup", "14ft Heavy Duty Container", "Multi-Axle Cargo Rig"],
    },
  };

  const currentVehicle = fleet[activeTab];
  const CurrentIcon = currentVehicle.icon;

  return (
    <div className="w-full min-h-screen bg-[#060606] text-white">
      <Nav />

      {/* Hero */}
      <section className="relative pt-36 pb-12 px-4 md:px-8 text-center overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] md:w-[600px] md:h-[600px] bg-blue-600/10 rounded-full blur-[100px] -z-10" />

        <div className="max-w-3xl mx-auto">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-linear-to-r from-white to-neutral-400"
          >
            The Rydex Fleet
          </motion.h1>
          <p className="text-neutral-400 text-sm md:text-base mt-4 max-w-lg mx-auto leading-relaxed">
            Choose the perfect vehicle category engineered precisely for your payload, budget, and destination criteria.
          </p>
        </div>
      </section>

      {/* Tabs */}
      <section className="py-6 px-4 md:px-8 max-w-4xl mx-auto">
        <div className="grid grid-cols-4 gap-2 md:gap-4 p-1.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
          {(["bike", "car", "bus", "truck"] as const).map((tab) => {
            const isActive = activeTab === tab;
            const TabIcon = fleet[tab].icon;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3.5 rounded-xl font-bold text-xs md:text-sm flex flex-col md:flex-row items-center justify-center gap-2 transition-all ${
                  isActive
                    ? "bg-white text-black shadow-lg"
                    : "text-neutral-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <TabIcon size={16} />
                <span className="capitalize">{tab}s</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Interactive Catalog Screen */}
      <section className="py-12 pb-24 px-4 md:px-8 max-w-5xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4 }}
            className="grid md:grid-cols-12 gap-8 p-8 md:p-12 rounded-3xl border border-white/10 bg-white/1 backdrop-blur-2xl relative"
          >
            {/* Dynamic ambient card flare */}
            <div className="absolute inset-0 bg-linear-to-tr from-blue-600/5 to-purple-600/5 rounded-3xl -z-10" />

            {/* Left Content (7 columns) */}
            <div className="md:col-span-7 space-y-6">
              <div>
                <span className="px-3.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-wider">
                  {currentVehicle.badge}
                </span>
                <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight mt-4 flex items-center gap-3">
                  <CurrentIcon size={32} className="text-blue-400" />
                  {currentVehicle.title}
                </h2>
              </div>

              <p className="text-neutral-400 text-sm md:text-base leading-relaxed">
                {currentVehicle.desc}
              </p>

              {/* Pricing Cards */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                <div className="p-4 rounded-xl bg-white/2 border border-white/5 flex flex-col">
                  <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold">Starting Base Fare</span>
                  <span className="text-2xl font-black text-white mt-1 flex items-center gap-1">
                    <IndianRupee size={18} />
                    {currentVehicle.baseFare}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-white/2 border border-white/5 flex flex-col">
                  <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold">Standard Fares</span>
                  <span className="text-2xl font-black text-white mt-1 flex items-center gap-1">
                    <IndianRupee size={18} />
                    {currentVehicle.perKm} <span className="text-xs text-neutral-500 font-medium font-sans">/ KM</span>
                  </span>
                </div>
              </div>

              {/* Specs */}
              <div className="space-y-3 pt-4">
                <h4 className="text-xs font-black text-neutral-400 uppercase tracking-widest">Technical Specifications</h4>
                <div className="grid gap-3">
                  {currentVehicle.specs.map((spec) => {
                    const SpecIcon = spec.icon;
                    return (
                      <div key={spec.label} className="flex items-center justify-between p-3 rounded-lg bg-white/1 border border-white/5 text-sm">
                        <span className="text-neutral-500 flex items-center gap-2">
                          <SpecIcon size={14} className="text-blue-400/80" />
                          {spec.label}
                        </span>
                        <span className="font-semibold text-white">{spec.value}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Showcase (5 columns) */}
            <div className="md:col-span-5 flex flex-col justify-between p-6 rounded-2xl bg-white/2 border border-white/5 space-y-6">
              <div>
                <h3 className="font-bold text-lg text-white mb-2">Available Categories</h3>
                <p className="text-xs text-neutral-500 leading-relaxed">We provide custom specifications for various models:</p>
                <div className="mt-4 space-y-2">
                  {currentVehicle.types.map((type) => (
                    <div key={type} className="px-4 py-2.5 rounded-xl bg-neutral-900 border border-white/10 text-xs text-white font-medium flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                      {type}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500">Max Carrying Payload:</span>
                  <span className="font-bold text-white bg-white/5 px-2.5 py-1 rounded-full border border-white/10">{currentVehicle.capacity}</span>
                </div>
                <button
                  onClick={() => window.location.href = "/"}
                  className="w-full py-3.5 rounded-xl bg-white text-black font-bold text-sm shadow-md hover:scale-[1.02] hover:bg-neutral-100 transition-all duration-300"
                >
                  Book Category Now
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </section>

      <Footer />
    </div>
  );
}
