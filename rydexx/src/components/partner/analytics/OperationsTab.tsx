"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { MapPin, Radio, Cpu } from "lucide-react";
import type { FleetVehicle, FleetDriver, LiveBooking } from "./types";

interface Props {
  vehicles: FleetVehicle[];
  drivers: FleetDriver[];
  bookings: LiveBooking[];
  mapCenterVehicle: string | null;
  onCenterVehicle: (id: string) => void;
  onAssignDriver: (bookingId: string, driverName: string) => void;
}

export function OperationsTab({
  vehicles, drivers, bookings, mapCenterVehicle, onCenterVehicle, onAssignDriver,
}: Props) {
  return (
    <motion.div
      key="operations-center"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="grid grid-cols-1 lg:grid-cols-12 gap-6"
    >
      {/* Radar Map */}
      <div className="lg:col-span-8 space-y-4">
        <div className="bg-gray-900 text-white rounded-3xl p-6 relative overflow-hidden h-[450px] shadow-inner flex flex-col justify-between border border-gray-800">
          <div className="absolute inset-0 bg-radial-to-t from-emerald-500/5 to-transparent pointer-events-none" />
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#ffffff_1px,transparent_1px)] bg-size-[24px_24px] pointer-events-none" />

          {/* Top HUD */}
          <div className="relative flex justify-between items-start z-10">
            <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-2xs font-bold uppercase tracking-widest text-emerald-400">Live Telemetry Loop</span>
            </div>
            <div className="flex gap-2">
              {vehicles.map((v) => (
                <button
                  key={v.id}
                  onClick={() => onCenterVehicle(v.id)}
                  className={`px-3 py-1.5 rounded-xl text-2xs font-bold transition flex items-center gap-1.5 border ${
                    mapCenterVehicle === v.id
                      ? "bg-emerald-500 border-emerald-400 text-black"
                      : "bg-black/40 border-white/10 text-white/80 hover:bg-black/60"
                  }`}
                >
                  <MapPin size={10} />
                  {v.number.split("-")[2]}
                </button>
              ))}
            </div>
          </div>

          {/* SVG board */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <svg className="w-5/6 h-5/6 opacity-75" viewBox="0 0 800 400">
              <path d="M 100 200 Q 400 50 700 200" fill="none" stroke="#ffffff" strokeWidth="1" strokeDasharray="5,5" />
              <path d="M 200 100 Q 400 300 600 100" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="8,4" />
              <path d="M 150 350 L 650 350" fill="none" stroke="#22c55e" strokeWidth="1" />
              <circle cx="450" cy="120" r="60" fill="#a855f7" className="animate-pulse opacity-10" />
              <circle cx="280" cy="220" r="40" fill="#ec4899" className="animate-pulse opacity-10" />
              <g transform="translate(100, 200)">
                <circle cx="0" cy="0" r="6" fill="#ef4444" />
                <text x="10" y="4" fill="#ffffff" fontSize="9" fontWeight="bold">Pickup: #b2</text>
              </g>
              <g transform="translate(700, 200)">
                <circle cx="0" cy="0" r="6" fill="#10b981" />
              </g>
              <g transform="translate(360, 125)" className="transition-all duration-1000">
                <circle cx="0" cy="0" r="16" fill="rgba(16, 185, 129, 0.2)" className="animate-ping" />
                <circle cx="0" cy="0" r="8" fill={mapCenterVehicle === "v1" ? "#10b981" : "#3b82f6"} />
                <text x="10" y="-8" fill="#ffffff" fontSize="8" fontWeight="bold">Ranjeet K.</text>
              </g>
              <g transform="translate(480, 250)">
                <circle cx="0" cy="0" r="8" fill={mapCenterVehicle === "v2" ? "#10b981" : "#3b82f6"} />
                <text x="10" y="12" fill="#ffffff" fontSize="8" fontWeight="bold">Suresh M.</text>
              </g>
              <g transform="translate(200, 100)">
                <circle cx="0" cy="0" r="10" fill="rgba(239, 68, 68, 0.2)" className="animate-ping" />
                <circle cx="0" cy="0" r="6" fill="#ef4444" />
                <text x="10" y="4" fill="#ffffff" fontSize="8" fontWeight="bold">Vikram (Charging)</text>
              </g>
            </svg>
          </div>

          {/* Bottom HUD */}
          <div className="relative z-10 flex justify-between items-end bg-black/60 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active Dispatch Target</p>
              <h4 className="text-sm font-black text-white mt-1">
                {mapCenterVehicle === "v1" && "Ranjeet K. — EV Car (HR-26)"}
                {mapCenterVehicle === "v2" && "Suresh M. — CNG Auto (HR-55)"}
                {mapCenterVehicle === "v3" && "Vikram R. — EV Bike (DL-3C)"}
                {mapCenterVehicle === "v4" && "Pradeep S. — Petrol Truck (UP-16)"}
              </h4>
              <p className="text-[10px] text-gray-500 mt-0.5">
                Status: {vehicles.find((v) => v.id === mapCenterVehicle)?.status} | Level:{" "}
                {vehicles.find((v) => v.id === mapCenterVehicle)?.level}%
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Current Velocity</p>
              <h3 className="text-lg font-black text-emerald-400 font-mono mt-1">
                {vehicles.find((v) => v.id === mapCenterVehicle)?.speed} km/h
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Booking queue */}
      <div className="lg:col-span-4 space-y-4">
        <div className="bg-gray-50 border border-gray-100 rounded-3xl p-5 h-full flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200/50 pb-3">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <Radio size={16} className="text-violet-600 animate-pulse" />
                Active Fares Queue
              </h3>
              <span className="text-2xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-bold">
                {bookings.filter((b) => b.status !== "Completed").length} Pending
              </span>
            </div>
            <div className="space-y-3 overflow-y-auto max-h-[300px]">
              {bookings.map((b) => (
                <div key={b.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span
                        className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          b.status === "Requested" ? "bg-amber-50 text-amber-600" :
                          b.status === "In Progress" ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"
                        }`}
                      >
                        {b.status}
                      </span>
                      <h4 className="text-xs font-bold text-gray-900 mt-2">Fare Ref: {b.id.toUpperCase()}</h4>
                    </div>
                    <span className="text-sm font-black text-gray-900 font-mono">₹{b.fare}</span>
                  </div>
                  <div className="text-[11px] text-gray-400 font-medium space-y-1">
                    <p className="flex items-center gap-1"><MapPin size={10} className="text-rose-500" /> {b.pickup}</p>
                    <p className="flex items-center gap-1"><MapPin size={10} className="text-emerald-500" /> {b.drop}</p>
                  </div>
                  {(b.passengers || b.notes) && (
                    <div className="text-[10px] text-zinc-500 bg-zinc-100/50 border border-zinc-200/40 rounded-xl p-2.5 space-y-1">
                      {b.passengers && <p className="font-bold">Seats: {b.passengers} Pax</p>}
                      {b.notes && <p className="italic font-semibold">&ldquo;{b.notes}&rdquo;</p>}
                    </div>
                  )}
                  <div className="border-t border-gray-50 pt-3 flex justify-between items-center flex-wrap gap-2">
                    <span className="text-2xs text-gray-400 font-bold">
                      Driver: {b.driver ? <span className="text-zinc-900">{b.driver}</span> : <span className="text-red-500">Unassigned ⚠️</span>}
                    </span>
                    {!b.driver && (
                      <button
                        onClick={() => onAssignDriver(b.id, "Suresh M.")}
                        className="px-2.5 py-1 bg-black text-white text-[10px] font-black rounded-lg hover:bg-gray-800 transition"
                      >
                        Assign Suresh
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-violet-50/50 border border-violet-100 rounded-2xl p-4 mt-4">
            <div className="flex gap-2 items-start">
              <Cpu size={16} className="text-violet-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-black text-violet-800 uppercase tracking-wider">AI Dispatch Dispatcher</p>
                <p className="text-2xs text-violet-700 leading-relaxed mt-0.5">
                  High surge zone detected around Dal Lake (Srinagar). Moving Suresh M. there will yield up to 1.3x higher booking rate.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
