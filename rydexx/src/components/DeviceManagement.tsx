"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import { startRegistration } from "@simplewebauthn/browser";
import { Fingerprint, Smartphone, Monitor } from "lucide-react";
import { Panel, PageHead } from "@/components/partner/shared";

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
  const [registeringPasskey, setRegisteringPasskey] = useState(false);

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

  const handleRegisterPasskey = async () => {
    setRegisteringPasskey(true);
    try {
      const optRes = await axios.get("/api/auth/webauthn/register/generate");
      const options = optRes.data;

      const attResp = await startRegistration(options);

      await axios.post("/api/auth/webauthn/register/verify", attResp);
      
      toast.success("Passkey registered successfully! You can now use it to sign in.");
    } catch (err: any) {
      console.error("Passkey registration failed:", err);
      
      const errorMessage = err.message || "";
      if (err.name === "NotAllowedError" || errorMessage.includes("timed out") || errorMessage.includes("not allowed")) {
        toast.error("Passkey registration was cancelled.");
      } else {
        toast.error(err.response?.data?.message || errorMessage || "Failed to register passkey. Try again.");
      }
    } finally {
      setRegisteringPasskey(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHead 
          code="SEC / 01" 
          title="Security Protocol" 
          subtitle="Manage your active sessions and secure your account access" 
        />
        <Panel code="SYS / 02" title="Active Devices">
          <div className="p-8 text-center mono text-[11px] tracking-[0.2em] uppercase text-muted-foreground">
            Loading devices...
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHead 
        code="SEC / 01" 
        title="Security Protocol" 
        subtitle="Manage your active sessions and secure your account access" 
      />
      <Panel code="SYS / 02" title="Active Devices">
      <div className="p-4 border-b border-border bg-secondary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="mono text-[10px] tracking-[0.15em] text-muted-foreground uppercase">
          Authorized Sessions: {sessions.length}
        </div>
        <button
          onClick={handleRegisterPasskey}
          disabled={registeringPasskey}
          className="brick px-4 py-2 font-mono text-[11px] tracking-[0.18em] uppercase hover:bg-signal transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Fingerprint size={14} />
          {registeringPasskey ? "Registering..." : "Add New Passkey"}
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="p-8 text-center mono text-[11px] tracking-[0.2em] uppercase text-muted-foreground">
          No active devices found.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full mono text-[11px] text-left">
            <thead>
              <tr className="hairline-b text-muted-foreground tracking-[0.18em] uppercase text-[9px]">
                <th className="py-3 px-4 font-normal w-12">Type</th>
                <th className="py-3 px-4 font-normal">Device / Browser</th>
                <th className="py-3 px-4 font-normal">IP Address</th>
                <th className="py-3 px-4 font-normal">Last Active</th>
                <th className="py-3 px-4 font-normal text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sessions.map((session) => (
                <tr 
                  key={session.sessionId}
                  className={`hover:bg-secondary/20 transition-colors ${session.isCurrent ? 'bg-signal/5' : ''}`}
                >
                  <td className="py-4 px-4 text-muted-foreground">
                    {session.userAgent.toLowerCase().includes("mobile") ? <Smartphone size={16} /> : <Monitor size={16} />}
                  </td>
                  <td className="py-4 px-4">
                    <div className="font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                      {session.userAgent}
                      {session.isCurrent && (
                        <span className="text-[8px] uppercase tracking-wider bg-signal text-background px-1.5 py-0.5 rounded-sm">
                          Current
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-muted-foreground">
                    {session.ipAddress}
                  </td>
                  <td className="py-4 px-4 text-muted-foreground">
                    {formatDistanceToNow(new Date(session.lastActive), { addSuffix: true })}
                  </td>
                  <td className="py-4 px-4 text-right">
                    {!session.isCurrent && (
                      <button
                        onClick={() => handleRevoke(session.sessionId)}
                        disabled={revokingId === session.sessionId}
                        className="text-signal hover:text-signal/80 transition-colors uppercase tracking-widest text-[9px] disabled:opacity-50"
                      >
                        {revokingId === session.sessionId ? "Revoking..." : "Revoke"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
    </div>
  );
}
