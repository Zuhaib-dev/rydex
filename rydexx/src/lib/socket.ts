import { io, Socket } from "socket.io-client"

let socket:Socket|null=null
const SOCKET_SERVER =
  process.env.NEXT_PUBLIC_SOCKET_SERVER || "https://rydex-nurn.onrender.com";

export const getSocket=()=>{
if(!socket){
    socket=io(SOCKET_SERVER.replace(/\/+$/, ""), {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 8,
        reconnectionDelay: 800,
    })
}
return socket
}
