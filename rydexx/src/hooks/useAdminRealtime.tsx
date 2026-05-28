"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getSocket } from "@/lib/socket";
import type {
  AdminDashboardScope,
  AdminDashboardUpdatePayload,
} from "@/lib/adminEvents";

export type AdminConnectionStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected";

type Listener = (payload: AdminDashboardUpdatePayload) => void;

type AdminRealtimeContextValue = {
  connectionStatus: AdminConnectionStatus;
  lastUpdateAt: number | null;
  subscribe: (listener: Listener) => () => void;
};

const AdminRealtimeContext = createContext<AdminRealtimeContextValue | null>(
  null,
);

function debounce<T extends (...args: never[]) => void>(fn: T, ms: number) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const wrapped = (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
  wrapped.cancel = () => {
    if (timer) clearTimeout(timer);
  };
  return wrapped;
}

export function AdminRealtimeProvider({ children }: { children: ReactNode }) {
  const [connectionStatus, setConnectionStatus] =
    useState<AdminConnectionStatus>("connecting");
  const [lastUpdateAt, setLastUpdateAt] = useState<number | null>(null);
  const listenersRef = useRef(new Set<Listener>());

  const subscribe = useCallback((listener: Listener) => {
    listenersRef.current.add(listener);
    return () => listenersRef.current.delete(listener);
  }, []);

  useEffect(() => {
    const socket = getSocket();

    const joinAdmin = () => {
      socket.emit("join-admin");
    };

    const handleConnect = () => {
      setConnectionStatus("connected");
      joinAdmin();
    };

    const handleDisconnect = () => {
      setConnectionStatus("disconnected");
    };

    const handleReconnectAttempt = () => {
      setConnectionStatus("reconnecting");
    };

    const handleAdminUpdate = (payload: AdminDashboardUpdatePayload) => {
      setLastUpdateAt(payload.at ?? Date.now());
      listenersRef.current.forEach((listener) => listener(payload));
    };

    if (socket.connected) {
      handleConnect();
    } else {
      setConnectionStatus("connecting");
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("reconnect_attempt", handleReconnectAttempt);
    socket.on("admin-dashboard-update", handleAdminUpdate);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("reconnect_attempt", handleReconnectAttempt);
      socket.off("admin-dashboard-update", handleAdminUpdate);
    };
  }, []);

  const value = useMemo(
    () => ({ connectionStatus, lastUpdateAt, subscribe }),
    [connectionStatus, lastUpdateAt, subscribe],
  );

  return (
    <AdminRealtimeContext.Provider value={value}>
      {children}
    </AdminRealtimeContext.Provider>
  );
}

export function useAdminRealtime() {
  const ctx = useContext(AdminRealtimeContext);
  if (!ctx) {
    throw new Error("useAdminRealtime must be used within AdminRealtimeProvider");
  }
  return ctx;
}

/** Subscribe to socket-driven refreshes for a specific admin data scope. */
export function useAdminRealtimeRefresh(
  scope: AdminDashboardScope,
  onRefresh: () => void | Promise<void>,
  enabled = true,
) {
  const { subscribe } = useAdminRealtime();
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (!enabled) return;

    const debounced = debounce(() => {
      void onRefreshRef.current();
    }, 280);

    const unsubscribe = subscribe((payload) => {
      if (payload.scope === "all" || payload.scope === scope) {
        debounced();
      }
    });

    return () => {
      debounced.cancel();
      unsubscribe();
    };
  }, [scope, enabled, subscribe]);
}
