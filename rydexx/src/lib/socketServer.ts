import axios from "axios";

const SOCKET_SERVER =
  process.env.SOCKET_SERVER_URL ||
  process.env.NEXT_PUBLIC_SOCKET_SERVER ||
  "https://rydex-nurn.onrender.com";

export async function emitToSocketServer(payload: {
  userId: string;
  event: string;
  data: unknown;
  /** When set, also broadcasts to `booking-{bookingId}` room */
  bookingId?: string;
}) {
  try {
    const socketSecret = process.env.SOCKET_INTERNAL_SECRET;
    await axios.post(`${SOCKET_SERVER.replace(/\/+$/, "")}/emit`, payload, {
      timeout: 8000,
      ...(socketSecret ? { headers: { "x-socket-secret": socketSecret } } : {}),
    });
  } catch (error) {
    console.warn("Socket emit failed:", error);
  }
}
