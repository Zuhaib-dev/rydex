"use client";

import { useState } from "react";
import { Send, CheckCircle2 } from "lucide-react";
import { PageHead, Panel } from "@/components/partner/shared";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function Broadcast() {
  const [target, setTarget] = useState("all");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const { data, mutate } = useSWR("/api/admin/audit-logs?action=NOTIFICATION.BROADCAST&limit=10", fetcher, { refreshInterval: 10000 });
  const logs = data?.logs || [];

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      setError("Title and Message Body are required.");
      return;
    }
    if (target === "specific" && !email.trim()) {
      setError("User Email is required for Specific User.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/admin/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target,
          email: target === "specific" ? email : undefined,
          title,
          message
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send notification");

      setSuccess(`Successfully sent notification to ${data.message.match(/\d+/) || "targeted"} user(s).`);
      setTitle("");
      setMessage("");
      if (target === "specific") setEmail("");
      mutate();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHead 
        code="ADM / 07" 
        title="Send Broadcast Notification" 
        subtitle="Push real-time notifications to users and partners. They will see a toast alert immediately if online, and can view it in their notification bell later." 
      />

      <Panel code="TX / 07" title="Compose Message" accent="text-signal">
        <div className="space-y-6">
          
          {error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 mono text-[11px] uppercase tracking-wider">{error}</div>}
          {success && <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center gap-2 mono text-[11px] uppercase tracking-wider"><CheckCircle2 className="w-4 h-4" /> {success}</div>}

          <div>
            <label className="block mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-3">Recipient Target</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "all", label: "Everyone" },
                { id: "users", label: "All Users" },
                { id: "partners", label: "All Partners" },
                { id: "specific", label: "Specific User" }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setTarget(opt.id)}
                  className={`py-3 px-4 mono text-[11px] tracking-wider uppercase border transition-colors ${
                    target === opt.id 
                      ? "border-signal bg-signal/10 text-signal" 
                      : "border-border hover:border-signal/50 bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {target === "specific" && (
            <div>
              <label className="block mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2">User Email</label>
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full bg-background border border-border p-3 mono text-[12px] focus:outline-none focus:border-signal transition-colors"
              />
            </div>
          )}

          <div>
            <label className="block mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2">Notification Title</label>
            <input 
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. System Update or Promo Offer"
              className="w-full bg-background border border-border p-3 mono text-[12px] focus:outline-none focus:border-signal transition-colors"
            />
          </div>

          <div>
            <label className="block mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2">Message Body</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="Enter the notification details here..."
              className="w-full bg-background border border-border p-3 mono text-[12px] focus:outline-none focus:border-signal transition-colors resize-none"
            />
          </div>

          <button 
            onClick={handleSend}
            disabled={loading}
            className="brick mono text-[11px] tracking-[0.2em] uppercase px-6 py-3.5 hover:bg-signal transition-colors cursor-pointer inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" /> {loading ? "Transmitting..." : "Send Notification"}
          </button>
        </div>
      </Panel>

      <Panel code="LOG / 07" title="Transmission History">
        <div className="overflow-x-auto">
          <table className="w-full mono text-[11px] text-left">
            <thead>
              <tr className="hairline-b text-muted-foreground tracking-[0.18em] uppercase text-[9px]">
                <th className="py-3 px-4 font-normal">Timestamp</th>
                <th className="py-3 px-4 font-normal">Target</th>
                <th className="py-3 px-4 font-normal">Title</th>
                <th className="py-3 px-4 font-normal">Reach</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-muted-foreground uppercase tracking-widest text-[10px]">No recent broadcasts</td></tr>
              ) : logs.map((l: any) => {
                const date = new Date(l.createdAt).toLocaleString("en-GB", {
                  day: "numeric", month: "short", hour: "numeric", minute: "2-digit"
                });
                
                return (
                  <tr key={l._id} className="hover:bg-secondary/20 transition-colors">
                    <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">{date}</td>
                    <td className="py-3 px-4 text-signal uppercase tracking-wider text-[10px]">{l.target === "specific" ? l.metadata?.emailTarget : l.target}</td>
                    <td className="py-3 px-4">{l.details}</td>
                    <td className="py-3 px-4">{l.metadata?.recipients} Users</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
