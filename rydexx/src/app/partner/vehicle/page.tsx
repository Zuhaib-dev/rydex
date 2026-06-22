"use client";

import { PageHead, Panel } from "@/components/partner/shared";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function Vehicle() {
  const { data } = useSWR("/api/vehicles", fetcher);
  const vehicles = data?.vehicles || [];
  const activeId = data?.activeVehicleId;

  return (
    <div className="space-y-6">
      <PageHead code="VEH / 03" title="My Vehicles" subtitle="Fleet dispatch units · Service log & papers" />
      
      {vehicles.map((vehicle: any) => {
        const isActive = vehicle._id === activeId;
        const SPECS = [
          ["Make / Model", `${vehicle.brand} ${vehicle.vehicleModel}`],
          ["Plate", vehicle.vehicleNumber],
          ["Class", vehicle.type?.toUpperCase() || "CAR"],
          ["Year", vehicle.manufacturingYear?.toString() || "2022"],
          ["Fuel", vehicle.fuelType?.toUpperCase() || "PETROL"],
          ["Seats", vehicle.seatingCapacity?.toString() || "4"],
        ];

        return (
          <div key={vehicle._id} className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Panel code={isActive ? "UNIT / ACTIVE" : "UNIT / IDLE"} title={isActive ? "Active Vehicle" : "Fleet Vehicle"} className="lg:col-span-2">
              <div className="flex items-center gap-2 mono text-[10px] tracking-[0.22em] uppercase mb-3">
                {isActive ? (
                  <span className="signal-chip px-2 py-0.5">Live on Rydex</span>
                ) : (
                  <span className="bg-ink text-bone px-2 py-0.5">Idle</span>
                )}
              </div>
              <div className="serif text-[56px] font-black leading-none tracking-tighter capitalize">{vehicle.vehicleModel}</div>
              <div className="mono text-[11px] tracking-[0.22em] uppercase text-muted-foreground mt-2">Plate · {vehicle.vehicleNumber}</div>
              <div className="mt-5 grid grid-cols-2 gap-x-6">
                {SPECS.map(([k, v]) => (
                  <div key={k} className="hairline-b py-2 flex items-center justify-between mono text-[11px] tracking-[0.15em] uppercase">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="text-foreground">{v}</span>
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
    </div>
  );
}
