import axios from "axios";

const SOCKET_SERVER =
  process.env.NEXT_PUBLIC_SOCKET_SERVER || "https://rydex-nurn.onrender.com";

export async function emitToSocketServer(payload: {
  userId: string;
  event: string;
  data: unknown;
}) {
  try {
    await axios.post(`${SOCKET_SERVER.replace(/\/+$/, "")}/emit`, payload, {
      timeout: 8000,
    });
  } catch (error) {
    console.warn("Socket emit failed:", error);
  }
}
