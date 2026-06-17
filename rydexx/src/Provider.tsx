"use client"
import { SessionProvider, useSession, signOut } from 'next-auth/react'
import React, { ReactNode, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'

function SessionGuard({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === "authenticated" && session && (session as any).error === "SessionBlocked") {
      toast.error("Your session was suspended or logged in from another device.", { duration: 6000 });
      signOut({ callbackUrl: "/signin" });
    }
  }, [session, status])

  return <>{children}</>
}

function Provider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider
      // Don't re-fetch the session on every window focus — reduces unnecessary /api/auth/session calls
      refetchOnWindowFocus={false}
      // Sync session across tabs every 5 minutes instead of the default 5 minutes (explicitly set)
      refetchInterval={5 * 60}
    >
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            maxWidth: "360px",
            fontSize: "14px",
            fontWeight: 500,
          },
        }}
      />
      <SessionGuard>
        {children}
      </SessionGuard>
    </SessionProvider>
  )
}

export default Provider
