"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { triggerHapticFeedback, playNotificationSound } from "@/lib/chatEffects";
import { getSocket } from "@/lib/socket";
import { PARTNER_GEO_PUSH_INTERVAL_MS } from "@/lib/matching/config";
import { useSharedLocation } from "@/hooks/useSharedLocation";

/**
 * Keeps partner GPS + availability synced on every partner route.
 * Mount via app/partner/layout.tsx (not only the home dashboard).
 */
export default function PartnerLiveTracker() {
  const { data: session, status } = useSession();
  const lastSentRef = useRef(0);
  const { position, error } = useSharedLocation();

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;

    const socket = getSocket();
    const userId = session.user.id;

    const identify = () => {
      socket.emit("identity", userId);
      socket.emit("partner-availability", { available: true });
    };

    identify();
    socket.on("connect", identify);

    const handleAdminAction = (data: { action: string }) => {
      if (data.action === "ping") {
        playNotificationSound("request");
        triggerHapticFeedback();
        toast.custom(
          (t) => (
            <div className={`bg-blue-600 text-white px-6 py-4 shadow-xl rounded-2xl flex items-center gap-3 ${t.visible ? 'animate-enter' : 'animate-leave'}`}>
              <span className="text-2xl">📡</span>
              <div>
                <p className="font-bold text-sm">Tower Ping</p>
                <p className="text-xs opacity-90">Admin is requesting your attention.</p>
              </div>
            </div>
          ),
          { duration: 8000 }
        );
      } else if (data.action === "logout") {
        signOut({ callbackUrl: "/auth/signin" });
      }
    };

    socket.on("admin-action", handleAdminAction);

    return () => {
      socket.emit("partner-availability", { available: false });
      socket.off("connect", identify);
      socket.off("admin-action", handleAdminAction);
    };
  }, [session?.user?.id, status]);

  const posRef = useRef(position);
  useEffect(() => {
    posRef.current = position;
  }, [position]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;

    const socket = getSocket();
    const userId = session.user.id;

    // Send heartbeat immediately on mount if we have a position
    if (posRef.current) {
      socket.emit("update-location", {
        userId,
        latitude: posRef.current.coords.latitude,
        longitude: posRef.current.coords.longitude,
      });
    }

    // Set interval to send heartbeats continuously even if position doesn't change
    const interval = setInterval(() => {
      const pos = posRef.current;
      if (!pos) return;
      socket.emit("update-location", {
        userId,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
    }, PARTNER_GEO_PUSH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [session?.user?.id, status]);

  useEffect(() => {
    if (error && error.code !== error.POSITION_UNAVAILABLE) {
      console.warn("Partner location unavailable:", error.message);
    }
  }, [error]);

  return null;
}
