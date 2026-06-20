"use client";

import { motion } from "motion/react";
import { MapPin } from "lucide-react";
import type { FleetVehicle, FleetDriver } from "./types";

interface Props {
  vehicles: FleetVehicle[];
  drivers: FleetDriver[];
  selectedVehicle: FleetVehicle | null;
  onSelectVehicle: (v: FleetVehicle) => void;
  onVehicleDriverChange: (vehicleId: string, driverName: string) => void;
  onScheduleMaintenance: (vehicle: FleetVehicle) => void;
}

export function FleetTab({
  vehicles, drivers, selectedVehicle, onSelectVehicle,
  onVehicleDriverChange, onScheduleMaintenance,
}: Props) {
  return (
    <motion.div
      key="fleet-directory"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {vehicles.map((v) => (
          <div
            key={v.id}
            onClick={() => onSelectVehicle(v)}
            className={`bg-white p-5 rounded-3xl border transition cursor-pointer flex flex-col gap-4 relative overflow-hidden shadow-xs hover:shadow-md hover:border-gray-200 ${
              selectedVehicle?.id === v.id ? "ring-2 ring-black" : "border-gray-100"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{v.type}</span>
                <h3 className="text-lg font-black text-gray-900 mt-0.5">{v.number}</h3>
              </div>
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  v.status === "Available" ? "bg-green-500 animate-pulse" :
                  v.status === "On Job" ? "bg-blue-500 animate-pulse" :
                  v.status === "Charging" ? "bg-amber-500 animate-pulse" : "bg-red-500"
                }`}
              />
            </div>

            {/* Level bar */}
            <div>
              <div className="flex justify-between text-2xs font-bold text-gray-400 uppercase mb-1.5">
                <span>{v.fuelType} Capacity</span>
                <span className="font-mono">{v.level}%</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    v.level < 20 ? "bg-red-500" : v.level < 60 ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${v.level}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs border-t border-gray-50 pt-3">
              <span className="text-gray-400 font-semibold">Driver</span>
              <span className="text-gray-900 font-bold">{v.driver}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Inspector drawer */}
      {selectedVehicle && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-50 border border-gray-100 p-6 rounded-3xl mt-6 flex flex-col lg:flex-row justify-between gap-6"
        >
          <div className="space-y-4 flex-1">
            <div className="flex items-center gap-3">
              <h4 className="text-xl font-black text-gray-900">
                Vehicle Inspector: {selectedVehicle.number}
              </h4>
              <span className="text-xs bg-black text-white px-2.5 py-0.5 rounded-full font-bold">
                {selectedVehicle.fuelType} Fuel System
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Active Speed", value: `${selectedVehicle.speed} km/h`, cls: "text-gray-900" },
                { label: "Operational Status", value: selectedVehicle.status, cls: "text-emerald-600 uppercase" },
                { label: "Assigned Driver", value: selectedVehicle.driver, cls: "text-gray-900" },
                { label: "OBD-II Diagnosis", value: "ALL SYSTEMS OK ✅", cls: "text-emerald-500 uppercase font-mono" },
              ].map(({ label, value, cls }) => (
                <div key={label} className="bg-white p-4 rounded-2xl border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">{label}</span>
                  <span className={`text-sm font-black mt-1 block ${cls}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full lg:w-80 shrink-0 bg-white p-4 rounded-2xl border border-gray-100 flex flex-col justify-between gap-4">
            <div>
              <h5 className="text-xs font-black text-gray-800 uppercase tracking-wider mb-2">
                Driver Assignment Panel
              </h5>
              <select
                className="w-full text-xs border border-gray-200 rounded-xl p-2.5 focus:ring-black focus:border-black"
                value={selectedVehicle.driver}
                onChange={(e) => onVehicleDriverChange(selectedVehicle.id, e.target.value)}
              >
                {drivers.map((d) => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => onScheduleMaintenance(selectedVehicle)}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition"
            >
              Schedule Maintenance Reminders
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
