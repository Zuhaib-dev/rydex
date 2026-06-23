"use client";

import { PageHead, Panel } from "@/components/partner/shared";
import { CommandSearch } from "@/components/admin/CommandSearch";

const VEH = [
  { id: "VEH-0421", plate: "JK04K9999", model: "Fortuner", type: "SUV", owner: "USR-4421", status: "live" },
  { id: "VEH-0422", plate: "JK01A1234", model: "Swift Dezire", type: "Sedan", owner: "USR-4422", status: "live" },
  { id: "VEH-0423", plate: "JK02B7821", model: "NS 200", type: "Bike", owner: "USR-4426", status: "service" },
  { id: "VEH-0424", plate: "JK04C9981", model: "Pulsar 150", type: "Bike", owner: "USR-4424", status: "frozen" },
  { id: "VEH-0425", plate: "JK01D4410", model: "Auto", type: "Auto", owner: "USR-4427", status: "live" },
];

export default function VehiclesDir() {
  return (
    <div className="space-y-6">
      <PageHead code="ADM / 05" title="Vehicle Directory" subtitle="412 fleet units · 38 in service · 2 flagged" />
      <CommandSearch placeholder="search_vehicle_or_plate" />
      <Panel code="VEH / 05" title="Fleet Ledger">
        <div className="overflow-x-auto">
          <table className="w-full mono text-[11px]">
            <thead>
              <tr className="hairline-b text-left text-muted-foreground tracking-[0.18em] uppercase text-[9px]">
                <th className="py-2 px-2">VEH_ID</th><th className="py-2 px-2">Plate</th><th className="py-2 px-2">Model</th><th className="py-2 px-2">Type</th><th className="py-2 px-2">Owner</th><th className="py-2 px-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {VEH.map((v) => (
                <tr key={v.id} className="hover:bg-ink hover:text-bone transition-colors group">
                  <td className="py-2.5 px-2 text-signal">{v.id}</td>
                  <td className="py-2.5 px-2">{v.plate}</td>
                  <td className="py-2.5 px-2 serif text-[14px]">{v.model}</td>
                  <td className="py-2.5 px-2">{v.type}</td>
                  <td className="py-2.5 px-2">{v.owner}</td>
                  <td className="py-2.5 px-2 text-right">
                    <span className={`mono text-[9px] tracking-[0.22em] px-1.5 py-0.5 ${
                      v.status === "frozen" ? "bg-signal text-bone" : v.status === "service" ? "brick" : "hairline group-hover:border-bone"
                    }`}>{v.status.toUpperCase()}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
