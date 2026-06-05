"use client";

import { useSession, signOut } from "next-auth/react";
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

    const handleBlocked = (data: { message?: string }) => {
      alert(data?.message || "Your account has been suspended.");
      signOut({ callbackUrl: "/signin" });
    };

    identify();
    socket.on("connect", identify);
    socket.on("blocked", handleBlocked);

    return () => {
      socket.off("connect", identify);
      socket.off("blocked", handleBlocked);
    };
  }, [session?.user?.id, status]);

  return null;
}

export default InitUser;
