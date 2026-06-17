"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { 
  Users, UserCheck, Shield, Ban, Search, CheckCircle, RefreshCw, 
  ChevronLeft, ChevronRight, Eye, EyeOff, ShieldAlert, Sparkles, AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useDispatch } from "react-redux";
import { startImpersonation } from "@/redux/userSlice";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface UserItem {
  _id: string;
  name: string;
  email: string;
  role: "user" | "partner" | "admin";
  mobileNumber?: string;
  isEmailVerified: boolean;
  isPartnerBlocked?: boolean;
  partnerStatus?: string;
  videoKycStatus?: string;
  isOnline?: boolean;
  ratingAverage?: number;
  ratingCount?: number;
  image?: string;
  createdAt: string;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function UserManagement() {
  const dispatch = useDispatch();
  const router = useRouter();
  
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [showSensitiveData, setShowSensitiveData] = useState(false);

  // Masking helpers
  const maskEmail = (email: string) => {
    if (!email) return "";
    if (showSensitiveData) return email;
    const [name, domain] = email.split("@");
    if (!domain) return "*******";
    return `${name.charAt(0)}***@${domain}`;
  };

  const maskPhone = (phone?: string) => {
    if (!phone) return "Not Linked";
    if (showSensitiveData) return phone;
    return phone.substring(0, 3) + "****" + phone.substring(phone.length - 3);
  };

  const fetchUsers = useCallback(async (pageNum = 1, currentSearch = search, currentRole = role, currentStatus = status) => {
    setRefreshing(true);
    try {
      const url = `/api/admin/users?page=${pageNum}&limit=10&search=${encodeURIComponent(currentSearch)}&role=${currentRole}&status=${currentStatus}`;
      const { data } = await axios.get(url);
      setUsers(data.users);
      setPagination(data.pagination);
      setPage(pageNum);
    } catch (error) {
      console.error("Failed to load users:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, role, status]);

  useEffect(() => {
    fetchUsers(1, "", "", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(1);
  };

  const handleFilterChange = (newRole: string, newStatus: string) => {
    setRole(newRole);
    setStatus(newStatus);
    fetchUsers(1, search, newRole, newStatus);
  };

  const handleToggleBlock = async (user: UserItem) => {
    setActionLoadingId(user._id);
    const targetBlockState = !user.isPartnerBlocked;
    try {
      const { data } = await axios.post(`/api/admin/users/${user._id}/block`, { block: targetBlockState });
      
      // Update local state
      setUsers(prev => prev.map(u => u._id === user._id ? { ...u, isPartnerBlocked: data.isPartnerBlocked } : u));
      if (selectedUser && selectedUser._id === user._id) {
        setSelectedUser(prev => prev ? { ...prev, isPartnerBlocked: data.isPartnerBlocked } : null);
      }
    } catch (error) {
      console.error("Error toggling user block state:", error);
      alert("Failed to block/unblock user. Please try again.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleImpersonate = (user: UserItem) => {
    // Client-side impersonation
    dispatch(startImpersonation(user));
    // Redirect to home screen to let admin see user-level UI
    router.push("/");
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-black text-white border-black";
      case "partner":
        return "bg-purple-50 text-purple-700 border-purple-100";
      default:
        return "bg-blue-50 text-blue-700 border-blue-100";
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <RefreshCw size={24} className="animate-spin text-gray-400" />
        <p className="text-sm font-semibold text-gray-500">Loading user directory...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">User Directory</h2>
          <p className="text-sm text-gray-400">Manage customer accounts, dispatch partners, and system permissions</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSensitiveData(!showSensitiveData)}
            className="flex h-10 px-3 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:border-gray-300 hover:text-gray-900"
            title={showSensitiveData ? "Hide Sensitive Data" : "Show Sensitive Data"}
          >
            {showSensitiveData ? <EyeOff size={16} /> : <Eye size={16} />}
            <span className="text-xs font-bold">{showSensitiveData ? "Hide" : "Show"} Data</span>
          </button>
          <button
            onClick={() => fetchUsers(page)}
            disabled={refreshing}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:border-gray-300 hover:text-gray-900 disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or mobile number..."
            className="w-full h-11 pl-10 pr-4 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:bg-white transition-all"
          />
          <Search size={16} className="absolute left-3.5 top-3.5 text-gray-400" />
        </form>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={role}
            onChange={(e) => handleFilterChange(e.target.value, status)}
            className="h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-600 focus:outline-none"
          >
            <option value="">All Roles</option>
            <option value="user">Rider (User)</option>
            <option value="partner">Partner (Driver)</option>
            <option value="admin">Admin</option>
          </select>

          <select
            value={status}
            onChange={(e) => handleFilterChange(role, e.target.value)}
            className="h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-600 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
      </div>

      {/* User Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-100/50 bg-white shadow-sm">
        {users.length === 0 ? (
          <div className="p-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 border border-gray-100 text-gray-400 mb-4">
              <Users size={24} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">No users found</h3>
            <p className="text-sm text-gray-400 mt-1">Try resetting your search query or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/75 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Phone</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                <AnimatePresence mode="popLayout">
                  {users.map((user) => (
                    <motion.tr
                      key={user._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-black text-sm font-black text-white">
                            {user.image ? (
                              <Image
                                src={user.image}
                                alt={user.name}
                                width={40}
                                height={40}
                                className="h-full w-full object-cover"
                                referrerPolicy="no-referrer"
                                unoptimized
                              />
                            ) : (
                              user.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 flex items-center gap-1.5">
                              {user.name}
                              {user.isOnline && (
                                <span className="h-2 w-2 rounded-full bg-green-500 inline-block animate-pulse" title="Online" />
                              )}
                            </p>
                            <p className="text-xs text-gray-400">{maskEmail(user.email)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold capitalize ${getRoleBadge(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 font-medium">
                        {maskPhone(user.mobileNumber)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                          user.isPartnerBlocked 
                            ? "bg-red-50 text-red-700 border border-red-200" 
                            : "bg-green-50 text-green-700 border border-green-200"
                        }`}>
                          {user.isPartnerBlocked ? <Ban size={10} /> : <UserCheck size={10} />}
                          {user.isPartnerBlocked ? "Suspended" : "Active"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-900 transition-all"
                            title="View Profile Details"
                          >
                            <Eye size={14} />
                          </button>
                          {user.role !== "admin" && (
                            <button
                              onClick={() => handleToggleBlock(user)}
                              disabled={actionLoadingId === user._id}
                              className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all ${
                                user.isPartnerBlocked
                                  ? "bg-green-50 border-green-200 text-green-600 hover:bg-green-100"
                                  : "bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
                              }`}
                              title={user.isPartnerBlocked ? "Activate Account" : "Suspend Account"}
                            >
                              <Ban size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => handleImpersonate(user)}
                            className="flex items-center gap-1 px-2.5 h-8 bg-black text-white rounded-lg text-xs font-bold hover:scale-[1.02] active:scale-[0.98] transition-all"
                            title="Impersonate User Session"
                          >
                            <Sparkles size={11} />
                            <span>Impersonate</span>
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-500">
            Showing Page {page} of {pagination.totalPages} ({pagination.total} total users)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => fetchUsers(page - 1)}
              disabled={page <= 1 || refreshing}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => fetchUsers(page + 1)}
              disabled={page >= pagination.totalPages || refreshing}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Profile Detail Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUser(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="relative w-full max-w-lg bg-white rounded-3xl p-8 shadow-2xl border border-gray-100 overflow-hidden"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Profile Details</h3>
                  <button 
                    onClick={() => setSelectedUser(null)}
                    className="text-gray-400 hover:text-black font-semibold text-xs"
                  >
                    Close
                  </button>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-black text-xl font-black text-white shadow-sm">
                    {selectedUser.image ? (
                      <Image
                        src={selectedUser.image}
                        alt={selectedUser.name}
                        width={64}
                        height={64}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    ) : (
                      selectedUser.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 leading-tight flex items-center gap-2">
                      {selectedUser.name}
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold capitalize ${getRoleBadge(selectedUser.role)}`}>
                        {selectedUser.role}
                      </span>
                    </h4>
                    <p className="text-xs text-gray-400 mt-1">{maskEmail(selectedUser.email)}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Joined: {new Date(selectedUser.createdAt).toLocaleDateString("en-IN")}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-gray-50 text-sm">
                    <span className="text-gray-400 font-semibold">Mobile Number</span>
                    <span className="text-gray-900 font-bold">{selectedUser.mobileNumber ? maskPhone(selectedUser.mobileNumber) : "N/A"}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-50 text-sm">
                    <span className="text-gray-400 font-semibold">Email Verified</span>
                    <span className={`font-bold flex items-center gap-1 ${selectedUser.isEmailVerified ? "text-green-600" : "text-amber-500"}`}>
                      {selectedUser.isEmailVerified ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                      {selectedUser.isEmailVerified ? "Verified" : "Pending"}
                    </span>
                  </div>
                  
                  {selectedUser.role === "partner" && (
                    <>
                      <div className="flex justify-between py-2 border-b border-gray-50 text-sm">
                        <span className="text-gray-400 font-semibold">Onboarding Stage</span>
                        <span className="text-gray-900 font-bold bg-gray-50 px-2 py-0.5 border border-gray-100 rounded text-xs">
                          Step {selectedUser.partnerStatus === "approved" ? "8 (Completed)" : selectedUser.videoKycStatus === "approved" ? "5 (Vehicle Register)" : "Pending Review"}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-50 text-sm">
                        <span className="text-gray-400 font-semibold">Driver Status</span>
                        <span className="text-gray-900 font-bold capitalize">{selectedUser.partnerStatus || "N/A"}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-50 text-sm">
                        <span className="text-gray-400 font-semibold">Video KYC Status</span>
                        <span className="text-gray-900 font-bold capitalize">{selectedUser.videoKycStatus || "Not Started"}</span>
                      </div>
                      {selectedUser.ratingCount ? (
                        <div className="flex justify-between py-2 border-b border-gray-50 text-sm">
                          <span className="text-gray-400 font-semibold">Rating</span>
                          <span className="text-gray-900 font-black">
                            ★ {selectedUser.ratingAverage?.toFixed(1) || "0.0"} ({selectedUser.ratingCount} reviews)
                          </span>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>

                {selectedUser.isPartnerBlocked && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-2xl text-xs text-red-700">
                    <ShieldAlert size={16} />
                    <p className="font-semibold">This user is currently blocked. They cannot request rides or accept logistics bookings.</p>
                  </div>
                )}

                <div className="pt-2 flex gap-3">
                  <button
                    onClick={() => handleImpersonate(selectedUser)}
                    className="flex-1 h-12 bg-black text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                  >
                    <Sparkles size={14} />
                    Impersonate Session
                  </button>
                  {selectedUser.role !== "admin" && (
                    <button
                      onClick={() => handleToggleBlock(selectedUser)}
                      disabled={actionLoadingId === selectedUser._id}
                      className={`px-6 h-12 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${
                        selectedUser.isPartnerBlocked
                          ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                          : "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                      }`}
                    >
                      {selectedUser.isPartnerBlocked ? "Activate" : "Suspend"}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
