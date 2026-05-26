"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import useGetMe from "./hooks/useGetMe";
import { getSocket } from "./lib/socket";

function InitUser() {
  const { data: session, status } = useSession();
  useGetMe(status === "authenticated");

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;

    const socket = getSocket();
    const identify = () => socket.emit("identity", session.user.id);

    identify();
    socket.on("connect", identify);

    return () => {
      socket.off("connect", identify);
    };
  }, [session?.user?.id, status]);

  return null;
}

export default InitUser;
