import axios from "axios";
import { getRedisClient } from "./redis";

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
    const redis = getRedisClient();
    await redis.publish("socket:emit", JSON.stringify(payload));
  } catch (error) {
    console.warn("Redis publish failed, falling back to HTTP POST emit:", error);
    try {
      const socketSecret = process.env.SOCKET_INTERNAL_SECRET;
      await axios.post(`${SOCKET_SERVER.replace(/\/+$/, "")}/emit`, payload, {
        timeout: 5000,
        ...(socketSecret ? { headers: { "x-socket-secret": socketSecret } } : {}),
      });
    } catch (httpError) {
      console.warn("Socket HTTP fallback emit failed:", httpError);
    }
  }
}

