"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { Shield, User, Clock, RefreshCw, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AuditLog {
  _id: string;
  adminName: string;
  adminEmail: string;
  action: string;
  targetId?: string;
  targetModel?: string;
  targetName?: string;
  details?: string;
  createdAt: string;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationData | null>(null);

  const fetchLogs = useCallback(async (pageNum = 1) => {
    setRefreshing(true);
    try {
      const { data } = await axios.get(`/api/admin/audit-logs?page=${pageNum}&limit=15`);
      setLogs(data.logs);
      setPagination(data.pagination);
      setPage(pageNum);
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  const getActionBadgeStyle = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes("approve") || act.includes("verified")) {
      return "bg-green-50 text-green-700 border-green-100";
    }
    if (act.includes("reject")) {
      return "bg-rose-50 text-rose-700 border-rose-100";
    }
    if (act.includes("block") || act.includes("failed") || act.includes("locked") || act.includes("error")) {
      return "bg-red-50 text-red-700 border-red-200";
    }
    if (act.includes("unblock")) {
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    }
    if (act.includes("signup")) {
      return "bg-blue-50 text-blue-700 border-blue-100";
    }
    if (act.includes("sos") || act.includes("suspend") || act.includes("invalid")) {
      return "bg-amber-50 text-amber-700 border-amber-100";
    }
    return "bg-gray-50 text-gray-700 border-gray-100";
  };

  const formatActionName = (action: string) => {
    const mappings: Record<string, string> = {
      user_signup: "New User Signup",
      user_signup_failed: "Signup Failed",
      email_verified: "Email Verified",
      email_verification_failed: "Email Verification Failed",
      email_verification_locked: "Verification Locked",
      email_verification_invalid_otp: "Invalid OTP Attempt",
      email_verification_error: "Verification Error",
      partner_signup_initiated: "Partner Signup Started",
      approve_partner_documents: "Partner Docs Approved",
      reject_partner: "Partner Docs Rejected",
      approved_video_kyc: "Partner KYC Approved",
      rejected_video_kyc: "Partner KYC Rejected",
      approved_vehicle: "Vehicle Approved / Partner Activated",
      rejected_vehicle: "Vehicle Rejected",
      suspended_vehicle: "Vehicle Suspended",
      block_user: "User Blocked",
      unblock_user: "User Unblocked",
      resolve_sos: "SOS Alert Resolved",
    };
    return mappings[action] || action.replace(/_/g, " ").toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <RefreshCw size={24} className="animate-spin text-gray-400" />
        <p className="text-sm font-semibold text-gray-500">Loading audit trail...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Security Audit Logs</h2>
          <p className="text-sm text-gray-400">Chronological history of all admin interventions</p>
        </div>
        <button
          onClick={() => fetchLogs(page)}
          disabled={refreshing}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition hover:border-gray-300 hover:text-gray-900 disabled:opacity-50"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100/50 bg-white shadow-sm">
        {logs.length === 0 ? (
          <div className="p-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 border border-gray-100 text-gray-400 mb-4">
              <Shield size={24} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">No actions recorded</h3>
            <p className="text-sm text-gray-400 mt-1">Audit logs will appear as administrators make changes.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/75 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Administrator</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Target</th>
                  <th className="px-6 py-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                <AnimatePresence mode="popLayout">
                  {logs.map((log) => (
                    <motion.tr
                      key={log._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="whitespace-nowrap px-6 py-4 text-xs font-semibold text-gray-400">
                        <span className="flex items-center gap-1.5">
                          <Clock size={12} />
                          {new Date(log.createdAt).toLocaleString("en-IN")}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 border border-slate-100 text-xs font-bold text-slate-700">
                            <User size={12} />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{log.adminName}</p>
                            <p className="text-xs text-gray-400">{log.adminEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${getActionBadgeStyle(log.action)}`}>
                          {formatActionName(log.action)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {log.targetName ? (
                          <div>
                            <p className="font-semibold text-gray-900">{log.targetName}</p>
                            <p className="text-xs text-gray-400 capitalize">
                              {log.targetModel} ID: {log.targetId?.substring(log.targetId.length - 6)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs font-medium">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500 font-medium max-w-xs leading-relaxed truncate hover:text-clip hover:whitespace-normal">
                        {log.details || "No details provided"}
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
            Showing Page {page} of {pagination.totalPages} ({pagination.total} total logs)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => fetchLogs(page - 1)}
              disabled={page <= 1 || refreshing}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => fetchLogs(page + 1)}
              disabled={page >= pagination.totalPages || refreshing}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
