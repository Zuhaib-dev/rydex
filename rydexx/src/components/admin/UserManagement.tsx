"use client";

import { useState } from "react";
import { PageHead, Panel } from "@/components/partner/shared";
import { Eye, EyeOff, X } from "lucide-react";
import useSWR, { mutate } from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const maskEmail = (email: string | undefined | null) => {
  if (!email) return "N/A";
  const [local, domain] = email.split("@");
  if (!domain) return email;
  return `${local[0] || ""}***@${domain}`;
};

const maskPhone = (phone: string | undefined | null) => {
  if (!phone) return "Not Linked";
  if (phone.length < 6) return phone;
  return `${phone.slice(0, 3)}****${phone.slice(-3)}`;
};

export default function UsersDir() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [showData, setShowData] = useState(false); // privacy mode by default
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const limit = 10;

  // Debounce search slightly
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  // Use a simple timeout for debouncing in a useEffect (omitted here for simplicity, using standard search)
  // To keep it clean, we'll just use the raw search state for now, but in a real app you'd debounce it.

  let url = `/api/admin/users?page=${page}&limit=${limit}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  if (role) url += `&role=${role}`;
  if (status) url += `&status=${status}`;

  const { data, isLoading } = useSWR(url, fetcher);
  
  const users = data?.users || [];
  const totalPages = data?.pagination?.totalPages || 1;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1); // reset to page 1 on search
  };

  const handleUpdateStatus = async (userId: string, currentBlocked: boolean) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ block: !currentBlocked })
      });
      if (!res.ok) throw new Error("Failed to update status");
      mutate(url);
      if (selectedUser && selectedUser._id === userId) {
        setSelectedUser({ ...selectedUser, isPartnerBlocked: !currentBlocked });
      }
    } catch (err) {
      alert("Error updating user status");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHead 
          code="ADM / 04" 
          title="User Directory" 
          subtitle="Manage customer accounts, dispatch partners, and system permissions" 
        />
        <button 
          onClick={() => setShowData(!showData)}
          className={`px-4 py-2 mono text-[10px] tracking-widest uppercase border transition-colors flex items-center gap-2 ${
            showData ? "border-signal text-signal bg-signal/10" : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          {showData ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {showData ? "Hide Data" : "Show Data"}
        </button>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input 
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Search by name, email, or mobile number..."
            className="w-full bg-background border border-border p-3 mono text-[11px] focus:outline-none focus:border-signal transition-colors"
          />
        </div>
        <select 
          value={role} 
          onChange={(e) => { setRole(e.target.value); setPage(1); }} 
          className="bg-background border border-border p-3 mono text-[11px] uppercase focus:outline-none focus:border-signal w-[150px]"
        >
          <option value="">All Roles</option>
          <option value="user">User</option>
          <option value="partner">Partner</option>
          <option value="admin">Admin</option>
        </select>
        <select 
          value={status} 
          onChange={(e) => { setStatus(e.target.value); setPage(1); }} 
          className="bg-background border border-border p-3 mono text-[11px] uppercase focus:outline-none focus:border-signal w-[150px]"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="blocked">Blocked</option>
        </select>
      </div>

      <Panel code="DIR / 04" title="Account Ledger">
        <div className="overflow-x-auto">
          <table className="w-full mono text-[11px] text-left">
            <thead>
              <tr className="hairline-b text-muted-foreground tracking-[0.18em] uppercase text-[9px]">
                <th className="py-3 px-4 font-normal">User</th>
                <th className="py-3 px-4 font-normal">Role</th>
                <th className="py-3 px-4 font-normal">Phone</th>
                <th className="py-3 px-4 font-normal">Status</th>
                <th className="py-3 px-4 font-normal text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={5} className="text-center py-8 text-muted-foreground uppercase tracking-widest text-[10px]">Loading directory...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-muted-foreground uppercase tracking-widest text-[10px]">No users found</td></tr>
              ) : users.map((u: any) => {
                const isBlocked = u.isPartnerBlocked;
                const statusStr = isBlocked ? "Blocked" : "Active";
                const displayEmail = showData ? u.email : maskEmail(u.email);
                const displayPhone = showData ? (u.mobileNumber || "Not Linked") : maskPhone(u.mobileNumber);
                const initial = u.name ? u.name.charAt(0).toUpperCase() : "?";

                return (
                  <tr key={u._id} className="hover:bg-secondary/20 transition-colors">
                    <td className="py-3 px-4 flex items-center gap-4">
                      <div className="w-10 h-10 shrink-0 bg-signal/10 text-signal flex items-center justify-center font-bold text-[14px] uppercase border border-signal/20">
                        {initial}
                      </div>
                      <div>
                        <div className="serif text-[15px] font-bold text-foreground mb-1">{u.name}</div>
                        <div className="mono text-[10px] text-muted-foreground">{displayEmail}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-signal uppercase tracking-widest">{u.role}</td>
                    <td className="py-3 px-4 text-muted-foreground tracking-widest">{displayPhone}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-1 uppercase tracking-widest text-[9px] ${
                        isBlocked ? "bg-red-500/10 text-red-500 border border-red-500/20" : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                      }`}>
                        {statusStr}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button 
                        onClick={() => setSelectedUser(u)}
                        className="px-4 py-1.5 border border-border hover:border-signal text-foreground hover:text-signal transition-colors uppercase tracking-widest text-[9px] mr-2"
                      >
                        View
                      </button>
                      <button 
                        onClick={() => handleUpdateStatus(u._id, u.isPartnerBlocked)}
                        disabled={isUpdating}
                        className={`px-4 py-1.5 border transition-colors uppercase tracking-widest text-[9px] disabled:opacity-50 ${
                          isBlocked 
                            ? "border-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white" 
                            : "border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white"
                        }`}
                      >
                        {isUpdating ? "..." : isBlocked ? "Activate" : "Suspend"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-border flex items-center justify-between">
            <button 
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="px-4 py-2 mono text-[10px] uppercase tracking-widest border border-border hover:bg-secondary disabled:opacity-50 transition-colors"
            >
              Prev
            </button>
            <span className="mono text-[10px] tracking-widest text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <button 
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              className="px-4 py-2 mono text-[10px] uppercase tracking-widest border border-border hover:bg-secondary disabled:opacity-50 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </Panel>

      {/* User Profile Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card hairline w-full max-w-md shadow-2xl flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-border bg-secondary/10 shrink-0">
              <h2 className="mono text-[11px] tracking-[0.2em] uppercase text-muted-foreground flex items-center gap-3">
                <span className="w-1.5 h-1.5 bg-signal rounded-full animate-pulse"></span>
                Profile Details
              </h2>
              <button 
                onClick={() => setSelectedUser(null)} 
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 shrink-0 bg-signal/10 text-signal flex items-center justify-center font-bold text-[24px] uppercase border border-signal/20">
                  {selectedUser.name ? selectedUser.name.charAt(0).toUpperCase() : "?"}
                </div>
                <div>
                  <div className="serif text-[20px] font-bold text-foreground leading-none mb-1">{selectedUser.name}</div>
                  <div className="mono text-[10px] uppercase tracking-widest text-signal mb-1">{selectedUser.role}</div>
                  <div className="mono text-[11px] text-muted-foreground">{showData ? selectedUser.email : maskEmail(selectedUser.email)}</div>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div>
                  <div className="mono text-[9px] uppercase tracking-widest text-muted-foreground mb-1">Joined</div>
                  <div className="mono text-[13px]">{new Date(selectedUser.createdAt).toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="mono text-[9px] uppercase tracking-widest text-muted-foreground mb-1">Mobile Number</div>
                  <div className="mono text-[13px]">{showData ? (selectedUser.mobileNumber || "Not Linked") : maskPhone(selectedUser.mobileNumber)}</div>
                </div>
                <div>
                  <div className="mono text-[9px] uppercase tracking-widest text-muted-foreground mb-1">Email Verified</div>
                  <div className={`mono text-[13px] ${selectedUser.isEmailVerified ? "text-emerald-500" : "text-amber-500"}`}>
                    {selectedUser.isEmailVerified ? "Verified" : "Unverified"}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button className="w-full py-3 bg-secondary text-foreground uppercase tracking-widest text-[11px] mono border border-border hover:bg-foreground hover:text-background transition-colors">
                  Impersonate Session
                </button>
                <button 
                  onClick={() => handleUpdateStatus(selectedUser._id, selectedUser.isPartnerBlocked)}
                  disabled={isUpdating}
                  className={`w-full py-3 uppercase tracking-widest text-[11px] mono transition-colors disabled:opacity-50 ${
                    selectedUser.isPartnerBlocked
                      ? "bg-emerald-500 text-white hover:bg-emerald-600"
                      : "bg-red-500 text-white hover:bg-red-600"
                  }`}
                >
                  {isUpdating ? "..." : selectedUser.isPartnerBlocked ? "Activate" : "Suspend"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
