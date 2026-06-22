"use client";

import { PageHead, Panel } from "@/components/partner/shared";
import useSWR from "swr";
import { useState } from "react";
import toast from "react-hot-toast";
import { Plus } from "lucide-react";

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function Vehicle() {
  const { data, mutate } = useSWR("/api/vehicles", fetcher);
  const vehicles = data?.vehicles || [];
  const activeId = data?.activeVehicleId;
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleMakeActive = async (id: string) => {
    try {
      const res = await fetch(`/api/vehicles/${id}/active`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      toast.success(json.message);
      mutate();
    } catch (err: any) {
      toast.error(err.message || "Failed to make vehicle active");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHead code="VEH / 03" title="My Vehicles" subtitle="Fleet dispatch units · Service log & papers" />
        <button 
          onClick={() => setIsModalOpen(true)}
          className="group flex items-center gap-2 hairline bg-signal text-bone hover:bg-ink px-4 py-2.5 mono text-[11px] tracking-[0.22em] uppercase transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Vehicle
        </button>
      </div>
      
      {vehicles.map((vehicle: any) => {
        const isActive = vehicle._id === activeId;
        const makeModel = `${vehicle.brand || ""} ${vehicle.vehicleModel || ""}`.trim() || "Unknown Vehicle";
        const SPECS = [
          ["Make / Model", makeModel],
          ["Plate", vehicle.vehicleNumber],
          ["Class", vehicle.type?.toUpperCase() || "CAR"],
          ["Year", vehicle.manufacturingYear?.toString() || "2022"],
          ["Fuel", vehicle.fuelType?.toUpperCase() || "PETROL"],
          ["Seats", vehicle.seatingCapacity?.toString() || "4"],
        ];

        return (
          <div key={vehicle._id} className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Panel code={isActive ? "UNIT / ACTIVE" : "UNIT / IDLE"} title={isActive ? "Active Vehicle" : "Fleet Vehicle"} className="lg:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 mono text-[10px] tracking-[0.22em] uppercase">
                  {isActive ? (
                    <span className="signal-chip px-2 py-0.5">Live on Rydex</span>
                  ) : (
                    <span className="bg-ink text-bone px-2 py-0.5">Idle</span>
                  )}
                </div>
                {!isActive && vehicle.status === "approved" && (
                  <button onClick={() => handleMakeActive(vehicle._id)} className="hairline px-3 py-1.5 mono text-[10px] tracking-[0.22em] uppercase hover:bg-signal hover:text-bone transition-colors">
                    Make Active
                  </button>
                )}
                {!isActive && vehicle.status !== "approved" && (
                  <span className="mono text-[10px] tracking-[0.22em] uppercase text-signal">Pending Approval</span>
                )}
              </div>
              <div className="serif text-[42px] md:text-[56px] font-black leading-none tracking-tighter capitalize truncate">{vehicle.vehicleModel || "Unknown"}</div>
              <div className="mono text-[11px] tracking-[0.22em] uppercase text-muted-foreground mt-2">Plate · {vehicle.vehicleNumber}</div>
              <div className="mt-5 grid grid-cols-2 gap-x-6">
                {SPECS.map(([k, v]) => (
                  <div key={k} className="hairline-b py-2 flex items-center justify-between mono text-[11px] tracking-[0.15em] uppercase">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="text-foreground text-right">{v}</span>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel code="STAT / 02" title="Compliance">
              <div className="space-y-3">
                {["Insurance · OK", "Permit · OK", "PUC · OK", "Fitness · OK"].map((s) => (
                  <div key={s} className="hairline p-3 flex items-center justify-between mono text-[11px] tracking-[0.18em] uppercase">
                    <span>{s}</span>
                    <span className="signal-chip px-1.5 py-0.5 text-[9px]">CLEAR</span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        );
      })}
      
      {vehicles.length === 0 && (
         <Panel code="SYS / 00" title="Empty Garage" className="lg:col-span-3">
           <div className="p-8 text-center mono text-[11px] tracking-[0.22em] uppercase text-muted-foreground">
             No vehicles found in your garage.
           </div>
         </Panel>
      )}

      {isModalOpen && <AddVehicleModal onClose={() => setIsModalOpen(false)} onSaved={() => { setIsModalOpen(false); mutate(); }} />}
    </div>
  );
}

function AddVehicleModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      let imageUrl = undefined;
      
      if (file) {
        if (file.size > 2 * 1024 * 1024) {
          throw new Error("Vehicle photo must be smaller than 2MB");
        }
        
        const uploadData = new FormData();
        uploadData.append("file", file);
        
        const uploadRes = await fetch("/api/upload", { method: "POST", body: uploadData });
        const uploadJson = await uploadRes.json();
        
        if (!uploadRes.ok) throw new Error(uploadJson.message || "Failed to upload image");
        imageUrl = uploadJson.url;
      }
      
      const fd = new FormData(e.currentTarget);
      const payload = { ...Object.fromEntries(fd.entries()), imageUrl };
      
      const res = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      
      toast.success("Vehicle added successfully");
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Failed to add vehicle");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl my-auto">
        <Panel code="MODAL / 01" title="Add New Vehicle">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-1 block">Vehicle Type</span>
                <select name="type" required className="w-full hairline bg-background p-3 mono text-[12px] uppercase">
                  <option value="bike">Bike</option>
                  <option value="auto">Auto</option>
                  <option value="car">Car</option>
                  <option value="loading">Loading</option>
                  <option value="truck">Truck</option>
                </select>
              </label>
              <label className="block">
                <span className="mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-1 block">Fuel Type</span>
                <select name="fuelType" required className="w-full hairline bg-background p-3 mono text-[12px] uppercase">
                  <option value="petrol">Petrol</option>
                  <option value="diesel">Diesel</option>
                  <option value="cng">CNG</option>
                  <option value="electric">Electric</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </label>
              <label className="block">
                <span className="mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-1 block">Brand / Make</span>
                <input name="brand" placeholder="e.g. Maruti Suzuki" required pattern="^[a-zA-Z\s.-]+$" title="Brand name contains invalid characters" className="w-full hairline bg-background p-3 mono text-[12px] uppercase placeholder:text-muted-foreground/50" />
              </label>
              <label className="block">
                <span className="mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-1 block">Model Name</span>
                <input name="vehicleModel" placeholder="e.g. Swift Dzire" required pattern="^[a-zA-Z0-9\-_()\/+.]+(?:\s+[a-zA-Z0-9\-_()\/+.]+)*$" title="Model contains invalid characters" className="w-full hairline bg-background p-3 mono text-[12px] uppercase placeholder:text-muted-foreground/50" />
              </label>
              <label className="block">
                <span className="mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-1 block">Registration Plate</span>
                <input name="vehicleNumber" placeholder="e.g. MH12AB1234" required pattern="^[A-Za-z]{2}[\s-]?[0-9]{2}[\s-]?[A-Za-z]{0,2}[\s-]?[0-9]{4}$" title="Invalid plate format (e.g. MH12 AB 1234)" className="w-full hairline bg-background p-3 mono text-[12px] uppercase placeholder:text-muted-foreground/50" />
              </label>
              <label className="block">
                <span className="mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-1 block">Color</span>
                <input name="color" placeholder="e.g. White" required pattern="^[a-zA-Z\s-]+$" title="Color contains invalid characters" className="w-full hairline bg-background p-3 mono text-[12px] uppercase placeholder:text-muted-foreground/50" />
              </label>
              <label className="block">
                <span className="mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-1 block">Mfg Year</span>
                <input name="manufacturingYear" type="number" min="1990" max="2026" defaultValue="2026" required className="w-full hairline bg-background p-3 mono text-[12px] uppercase" />
              </label>
              <label className="block">
                <span className="mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-1 block">Seats</span>
                <input name="seatingCapacity" type="number" min="1" max="20" defaultValue="4" required className="w-full hairline bg-background p-3 mono text-[12px] uppercase" />
              </label>
              <label className="block">
                <span className="mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-1 block">Base Fare (₹)</span>
                <input name="baseFare" type="number" min="1" max="200" defaultValue="50" required className="w-full hairline bg-background p-3 mono text-[12px] uppercase" />
              </label>
              <label className="block">
                <span className="mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-1 block">Per KM Rate (₹)</span>
                <input name="perKmRate" type="number" min="5" max="200" defaultValue="15" required className="w-full hairline bg-background p-3 mono text-[12px] uppercase" />
              </label>
              <label className="block">
                <span className="mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-1 block">Waiting Fees (₹/m)</span>
                <input name="waitingCharge" type="number" min="1" max="10" defaultValue="2" required className="w-full hairline bg-background p-3 mono text-[12px] uppercase" />
              </label>
              <label className="block md:col-span-2">
                <span className="mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-1 block">Vehicle Photo (Max 2MB)</span>
                <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full hairline bg-background p-3 mono text-[12px] uppercase file:mr-4 file:py-1 file:px-4 file:bg-signal file:text-bone file:border-0 file:mono file:text-[10px] file:uppercase file:cursor-pointer hover:file:bg-ink file:transition-colors" />
              </label>
            </div>
            
            <div className="flex gap-3 justify-end pt-4 mt-6 hairline-t border-border">
              <button type="button" onClick={onClose} disabled={loading} className="hairline px-6 py-3 mono text-[11px] tracking-[0.22em] uppercase hover:bg-secondary transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="bg-signal text-bone px-6 py-3 mono text-[11px] tracking-[0.22em] uppercase hover:bg-ink transition-colors">
                {loading ? "Saving..." : "Save Vehicle"}
              </button>
            </div>
          </form>
        </Panel>
      </div>
    </div>
  );
}