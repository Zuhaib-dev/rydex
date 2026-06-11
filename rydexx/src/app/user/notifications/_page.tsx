"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  ArrowLeft,
  CheckCheck,
  Car,
  ClipboardCheck,
  Video,
  Megaphone,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Inbox,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket";

type Notification = {
  _id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  type: string;
};

function getNotifMeta(type: string): {
  Icon: React.ElementType;
  color: string;
  bg: string;
} {
  switch (type) {
    case "PARTNER_DOCS_APPROVED":
    case "PARTNER_ACCOUNT_APPROVED":
      return { Icon: ShieldCheck, color: "text-emerald-400", bg: "bg-emerald-400/10" };
    case "KYC_APPROVED":
      return { Icon: Video, color: "text-blue-400", bg: "bg-blue-400/10" };
    case "KYC_REJECTED":
    case "VEHICLE_REJECTED":
    case "VEHICLE_SUSPENDED":
      return { Icon: AlertTriangle, color: "text-red-400", bg: "bg-red-400/10" };
    case "ADMIN_BROADCAST":
      return { Icon: Megaphone, color: "text-amber-400", bg: "bg-amber-400/10" };
    default:
      if (type?.startsWith("PARTNER"))
        return { Icon: ClipboardCheck, color: "text-violet-400", bg: "bg-violet-400/10" };
      return { Icon: Car, color: "text-zinc-400", bg: "bg-zinc-400/10" };
  }
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const socket = getSocket();
    const handleNew = (data: any) => {
      setNotifications((prev) => [
        {
          _id: data._id || `tmp-${Date.now()}`,
          title: data.title,
          message: data.message,
          isRead: false,
          createdAt: data.createdAt || new Date().toISOString(),
          type: data.type || "SYSTEM",
        },
        ...prev,
      ]);
      setUnreadCount((c) => c + 1);
    };
    socket.on("new-notification", handleNew);
    return () => { socket.off("new-notification", handleNew); };
  }, [fetchNotifications]);

  const markRead = async (id: string) => {
    const isAll = id === "all";
    if (isAll) {
      setMarkingAll(true);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } else {
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
    } finally {
      if (isAll) setMarkingAll(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060608] text-white">
      {/* Ambient glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 40% at 50% -10%, rgba(158,255,107,0.05) 0%, transparent 70%)",
        }}
      />

      {/* ── STICKY HEADER ─────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-white/6 bg-[#060608]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-2xl px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-all"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="flex-1">
            <h1 className="text-xl font-bold tracking-tight">Notifications</h1>
            {!loading && unreadCount > 0 && (
              <p className="text-xs text-zinc-500 mt-0.5">
                {unreadCount} unread
              </p>
            )}
          </div>

          <AnimatePresence>
            {unreadCount > 0 && !markingAll && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => markRead("all")}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-400 hover:bg-white/10 hover:text-white transition-all"
              >
                <CheckCheck size={13} />
                Mark all read
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* ── CONTENT ───────────────────────────────── */}
      <main className="mx-auto max-w-2xl px-4 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 size={28} className="animate-spin text-zinc-600" />
            <p className="text-sm text-zinc-600">Loading notifications…</p>
          </div>
        ) : notifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center py-32 gap-5 text-center"
          >
            <div className="w-20 h-20 rounded-3xl bg-white/4 border border-white/8 flex items-center justify-center">
              <Inbox size={32} className="text-zinc-600" />
            </div>
            <div>
              <p className="text-base font-semibold text-zinc-400">All caught up</p>
              <p className="text-sm text-zinc-600 mt-1 max-w-xs">
                No notifications yet. We'll ping you when something happens.
              </p>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {notifications.map((n, i) => {
                const { Icon, color, bg } = getNotifMeta(n.type);
                return (
                  <motion.div
                    key={n._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: Math.min(i * 0.04, 0.25),
                      duration: 0.32,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    onClick={() => { if (!n.isRead) markRead(n._id); }}
                    className={`relative flex gap-4 rounded-2xl border p-4 cursor-pointer transition-all duration-200
                      ${
                        n.isRead
                          ? "border-white/5 bg-white/[0.02] hover:bg-white/5"
                          : "border-white/10 bg-white/[0.05] hover:bg-white/8"
                      }`}
                  >
                    {/* Unread dot */}
                    {!n.isRead && (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#9eff6b] shadow-[0_0_8px_#9eff6b80]" />
                    )}

                    {/* Icon badge */}
                    <div
                      className={`shrink-0 flex h-10 w-10 items-center justify-center rounded-2xl ${bg}`}
                    >
                      <Icon size={18} className={color} />
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-sm font-semibold leading-snug ${
                            n.isRead ? "text-zinc-400" : "text-white"
                          }`}
                        >
                          {n.title}
                        </p>
                        <span className="shrink-0 text-[10px] font-medium text-zinc-600 mt-0.5 whitespace-nowrap">
                          {timeAgo(n.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-500 leading-relaxed line-clamp-3">
                        {n.message}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Footer */}
            <div className="pt-6 pb-12 text-center">
              <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-700">
                <Bell size={10} />
                End of notifications
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
