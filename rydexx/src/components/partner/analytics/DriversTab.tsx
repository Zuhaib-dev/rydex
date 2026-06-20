"use client";

import { motion } from "motion/react";
import { Cpu, Trophy, Star } from "lucide-react";
import type { FleetDriver } from "./types";

interface Props {
  drivers: FleetDriver[];
  selectedDriver: FleetDriver | null;
  onSelectDriver: (d: FleetDriver) => void;
  onSendAlert: (driver: FleetDriver) => void;
}

export function DriversTab({ drivers, selectedDriver, onSelectDriver, onSendAlert }: Props) {
  return (
    <motion.div
      key="driver-roster"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {drivers.map((d) => (
          <div
            key={d.id}
            onClick={() => onSelectDriver(d)}
            className={`bg-white p-5 rounded-3xl border transition cursor-pointer flex flex-col justify-between gap-4 relative overflow-hidden shadow-xs hover:shadow-md hover:border-gray-200 ${
              selectedDriver?.id === d.id ? "ring-2 ring-black" : "border-gray-100"
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex gap-3 items-center">
                <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-sm">
                  {d.name.substring(0, 2)}
                </div>
                <div>
                  <h4 className="text-base font-black text-gray-900">{d.name}</h4>
                  <span
                    className={`inline-flex items-center gap-1.5 text-3xs font-black uppercase tracking-wider ${
                      d.status === "Active" ? "text-emerald-500" :
                      d.status === "Idle" ? "text-blue-500" : "text-gray-400"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        d.status === "Active" ? "bg-emerald-500 animate-pulse" :
                        d.status === "Idle" ? "bg-blue-500 animate-pulse" : "bg-gray-300"
                      }`}
                    />
                    {d.status} Status
                  </span>
                </div>
              </div>
              <span className="text-sm font-black text-gray-900 font-mono">Today: ₹{d.earnings}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 border-y border-gray-50 py-3 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400 font-semibold">Rating</span>
                <span className="font-bold flex items-center gap-0.5 text-zinc-800 font-mono">
                  {d.rating} <Star size={10} className="fill-amber-400 text-amber-400" />
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 font-semibold">Safety Score</span>
                <span
                  className={`font-bold font-mono ${
                    d.safetyScore >= 95 ? "text-emerald-600" :
                    d.safetyScore >= 90 ? "text-blue-600" : "text-amber-600"
                  }`}
                >
                  {d.safetyScore}/100
                </span>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-3.5 flex gap-2 items-start">
              <Cpu size={14} className="text-violet-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-[9px] font-black text-violet-800 uppercase tracking-widest">AI Coaching Tip</p>
                <p className="text-3xs text-violet-700 leading-relaxed font-semibold mt-0.5">{d.coaching}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Scorecard detail */}
      {selectedDriver && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900 text-white p-6 rounded-3xl mt-6 flex flex-col lg:flex-row justify-between gap-6"
        >
          <div className="space-y-4 flex-1">
            <h4 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
              <Trophy size={20} className="text-amber-400" />
              Driver Scorecard: {selectedDriver.name}
            </h4>
            <p className="text-xs text-white/50">
              Performance metrics calculated from live booking coordinates tracking streams.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {[
                { label: "Acceleration Index", value: "Smooth Starts (98%)" },
                { label: "Cornering Speed G-Force", value: "Low G-Force (0.24G)" },
                { label: "Harsh Braking Incidents", value: "0 Detected today", cls: "text-red-400" },
              ].map(({ label, value, cls }) => (
                <div key={label} className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block">{label}</span>
                  <span className={`text-sm font-black font-mono mt-1.5 block ${cls ?? "text-white"}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full lg:w-80 shrink-0 bg-white/5 border border-white/5 p-5 rounded-2xl flex flex-col justify-between gap-4 text-xs">
            <div>
              <h5 className="font-black text-amber-400 uppercase tracking-wider mb-2">Driver Attendance &amp; Duty</h5>
              <p className="text-white/60">Shift started today at 08:30 AM.</p>
              <p className="text-white/60 mt-1">Uptime Hours: 8h 12m</p>
            </div>
            <button
              onClick={() => onSendAlert(selectedDriver)}
              className="w-full py-2.5 bg-white text-black font-black rounded-xl text-2xs transition hover:bg-white/90"
            >
              Send Performance Incentives Alert
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
