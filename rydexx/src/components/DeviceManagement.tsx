"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";

interface SessionData {
  sessionId: string;
  userAgent: string;
  ipAddress: string;
  lastActive: string;
  signedInAt: string;
  isCurrent: boolean;
}

export default function DeviceManagement() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      const res = await axios.get("/api/user/sessions");
      setSessions(res.data.sessions || []);
    } catch (err) {
      console.error("Failed to load sessions", err);
      toast.error("Failed to load active devices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleRevoke = async (sessionId: string) => {
    setRevokingId(sessionId);
    try {
      await axios.delete("/api/user/sessions", {
        data: { sessionId },
      });
      toast.success("Device signed out successfully");
      setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to sign out device");
    } finally {
      setRevokingId(null);
    }
  };

  if (loading) {
    return (
      <div className="w-full flex justify-center py-8">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white mb-1">Active Devices</h2>
        <p className="text-sm text-gray-400">
          Manage the devices currently logged into your account.
        </p>
      </div>

      {sessions.length === 0 ? (
        <p className="text-sm text-gray-500">No active devices found.</p>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.sessionId}
              className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                session.isCurrent
                  ? "bg-white/10 border-primary/40"
                  : "bg-white/5 border-white/10 hover:bg-white/10"
              } backdrop-blur-md`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  {session.userAgent.toLowerCase().includes("mobile") ? (
                    <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-200 flex items-center gap-2">
                    {session.userAgent}
                    {session.isCurrent && (
                      <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider">
                        Current
                      </span>
                    )}
                  </h3>
                  <div className="text-xs text-gray-400 mt-1 flex flex-col sm:flex-row sm:gap-4 gap-1">
                    <span>IP: {session.ipAddress}</span>
                    <span className="hidden sm:inline">•</span>
                    <span>
                      Active: {formatDistanceToNow(new Date(session.lastActive), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>

              {!session.isCurrent && (
                <button
                  onClick={() => handleRevoke(session.sessionId)}
                  disabled={revokingId === session.sessionId}
                  className="px-4 py-2 text-sm font-medium text-red-400 bg-red-400/10 hover:bg-red-400/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap"
                >
                  {revokingId === session.sessionId ? "Signing out..." : "Sign Out Device"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
