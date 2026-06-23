"use client";

import { PageHead, Panel } from "@/components/partner/shared";
import { CommandSearch } from "@/components/admin/CommandSearch";

import useSWR from "swr";
import { useState } from "react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function UsersDir() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useSWR(`/api/admin/users?page=${page}&limit=50`, fetcher);
  
  const users = data?.users || [];
  const total = data?.pagination?.total || 0;

  return (
    <div className="space-y-6">
      <PageHead code="ADM / 04" title="User Directory" subtitle={`${isLoading ? "..." : total} accounts · indexed live`} />
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
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Loading directory...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No users found.</td></tr>
              ) : users.map((u: any) => {
                const isFrozen = u.isPartnerBlocked;
                const statusStr = isFrozen ? "frozen" : "active";
                return (
                <tr key={u._id} className="hover:bg-ink hover:text-bone transition-colors group">
                  <td className="py-2.5 px-2 text-signal">USR-{u._id.substring(u._id.length - 4).toUpperCase()}</td>
                  <td className="py-2.5 px-2 serif text-[14px]">{u.name}</td>
                  <td className="py-2.5 px-2">{u.role}</td>
                  <td className="py-2.5 px-2">SXR</td>
                  <td className="py-2.5 px-2">{u.totalRides || 0}</td>
                  <td className="py-2.5 px-2">{u.rating || "5.0"}</td>
                  <td className="py-2.5 px-2 text-right">
                    <span className={`mono text-[9px] tracking-[0.22em] px-1.5 py-0.5 ${
                      isFrozen ? "bg-signal text-bone" : "hairline group-hover:border-bone"
                    }`}>{statusStr.toUpperCase()}</span>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
