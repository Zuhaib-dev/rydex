import axios from "axios";

const SOCKET_SERVER =
  process.env.SOCKET_SERVER_URL ||
  process.env.NEXT_PUBLIC_SOCKET_SERVER ||
  "https://rydex-nurn.onrender.com";

export type AdminDashboardScope = "dashboard" | "map" | "earnings" | "all";

export type AdminDashboardUpdatePayload = {
  scope: AdminDashboardScope;
  reason?: string;
  at: number;
};

/** Broadcast a live update to every connected admin dashboard client. */
export async function notifyAdminDashboard(
  payload: {
    scope?: AdminDashboardScope;
    reason?: string;
  } = {},
) {
  const data: AdminDashboardUpdatePayload = {
    scope: payload.scope ?? "all",
    reason: payload.reason,
    at: Date.now(),
  };

  try {
    await axios.post(
      `${SOCKET_SERVER.replace(/\/+$/, "")}/emit-admin`,
      { event: "admin-dashboard-update", data },
      { timeout: 8000 },
    );
  } catch (error) {
    console.warn("Admin dashboard notify failed:", error);
  }
}
