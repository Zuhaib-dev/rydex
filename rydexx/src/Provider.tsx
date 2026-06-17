"use client"
import { SessionProvider } from 'next-auth/react'
import React, { ReactNode } from 'react'
import { Toaster } from 'react-hot-toast'

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
      {children}
    </SessionProvider>
  )
}

export default Provider
