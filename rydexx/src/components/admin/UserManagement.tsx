"use client";

import { PageHead, Panel } from "@/components/partner/shared";
import { CommandSearch } from "@/components/admin/CommandSearch";

const USERS = [
  { id: "USR-4421", name: "Zuhaib Rashid", role: "Partner", region: "SXR", rides: 312, rating: 4.92, status: "active" },
  { id: "USR-4422", name: "Mehraj Bhat", role: "Rider", region: "SXR", rides: 28, rating: 4.74, status: "active" },
  { id: "USR-4423", name: "Aisha Khan", role: "Rider", region: "JMU", rides: 104, rating: 4.88, status: "active" },
  { id: "USR-4424", name: "Imran Lone", role: "Partner", region: "SXR", rides: 188, rating: 4.61, status: "frozen" },
  { id: "USR-4425", name: "Sara Mir", role: "Rider", region: "SXR", rides: 9, rating: 4.20, status: "active" },
  { id: "USR-4426", name: "Bilal Wani", role: "Partner", region: "SXR", rides: 421, rating: 4.95, status: "active" },
  { id: "USR-4427", name: "Hina Qureshi", role: "Rider", region: "SXR", rides: 71, rating: 4.80, status: "active" },
];

export default function UsersDir() {
  return (
    <div className="space-y-6">
      <PageHead code="ADM / 04" title="User Directory" subtitle="1,204 active accounts · indexed live" />
      <CommandSearch placeholder="search_user_by_id_or_name" />
      <Panel code="DIR / 04" title="Account Ledger">
        <div className="overflow-x-auto">
          <table className="w-full mono text-[11px]">
            <thead>
              <tr className="hairline-b text-left text-muted-foreground tracking-[0.18em] uppercase text-[9px]">
                <th className="py-2 px-2">USR_ID</th><th className="py-2 px-2">Name</th><th className="py-2 px-2">Role</th><th className="py-2 px-2">Region</th><th className="py-2 px-2">Rides</th><th className="py-2 px-2">Rating</th><th className="py-2 px-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {USERS.map((u) => (
                <tr key={u.id} className="hover:bg-ink hover:text-bone transition-colors group">
                  <td className="py-2.5 px-2 text-signal">{u.id}</td>
                  <td className="py-2.5 px-2 serif text-[14px]">{u.name}</td>
                  <td className="py-2.5 px-2">{u.role}</td>
                  <td className="py-2.5 px-2">{u.region}</td>
                  <td className="py-2.5 px-2">{u.rides}</td>
                  <td className="py-2.5 px-2">{u.rating}</td>
                  <td className="py-2.5 px-2 text-right">
                    <span className={`mono text-[9px] tracking-[0.22em] px-1.5 py-0.5 ${
                      u.status === "frozen" ? "bg-signal text-bone" : "hairline group-hover:border-bone"
                    }`}>{u.status.toUpperCase()}</span>
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
