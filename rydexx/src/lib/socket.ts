import { io, Socket } from "socket.io-client"

let socket:Socket|null=null
const SOCKET_SERVER =
  process.env.NEXT_PUBLIC_SOCKET_SERVER || "https://rydex-nurn.onrender.com";

export const getSocket=()=>{
if(!socket){
    socket=io(SOCKET_SERVER.replace(/\/+$/, ""), {
        transports: ["websocket", "polling"],
        auth: (callback) => {
            fetch("/api/socket-token", {
                credentials: "same-origin",
                cache: "no-store",
            })
                .then(async (response) => {
                    // A signed-in user without a token must not silently become
                    // an anonymous socket: that would look connected but miss
                    // all booking and admin events. A 401 is expected for a
                    // public visitor; other failures should surface to Socket.IO.
                    if (response.status === 401) return callback({});
                    if (!response.ok) return callback({ socketAuthError: response.status });
                    const data = await response.json();
                    callback({ token: data.token });
                })
                .catch(() => callback({ socketAuthError: "unavailable" }));
        },
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
    })
}
return socket
}
