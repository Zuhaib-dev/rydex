"use client";

import { useEffect, useState } from "react";
import { getToken, onMessage } from "firebase/messaging";
import { initMessaging, VAPID_KEY } from "@/lib/firebase";
import { useSession } from "next-auth/react";

/**
 * useFCM — requests notification permission and registers an FCM token.
 *
 * @param enabled - Set to `false` to delay the permission prompt until a more
 *                  appropriate moment (e.g., after the user's first booking).
 *                  Defaults to `true` (immediate prompt on mount).
 */
export function useFCM({ enabled = true }: { enabled?: boolean } = {}) {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const { data: session } = useSession();
  const userId = session?.user?.id;

  useEffect(() => {
    if (!enabled || !userId) return;

    let unsubscribe: (() => void) | undefined;

    const requestPermissionAndGetToken = async () => {
      try {
        if (typeof window === "undefined" || !("Notification" in window)) return;

        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          const messaging = await initMessaging();
          if (messaging) {
            const registration = "serviceWorker" in navigator
              ? await navigator.serviceWorker.register("/firebase-messaging-sw.js")
              : undefined;

            // Get token
            const token = await getToken(messaging, {
              vapidKey: VAPID_KEY,
              serviceWorkerRegistration: registration,
            });

            if (token) {
              setFcmToken(token);
              localStorage.setItem("fcm_token", token);
              // Send token to backend
              await fetch("/api/user/fcm-token", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token }),
              });
            } else {
              console.warn("No registration token available. Request permission to generate one.");
            }

            unsubscribe = onMessage(messaging, (payload) => {
              const title = payload.notification?.title || "Rydex Update";
              const body = payload.notification?.body || "You have a new update.";

              if (Notification.permission === "granted") {
                const notification = new Notification(title, {
                  body,
                  icon: "/icon-192x192.png",
                  data: {
                    ...payload.data,
                    isForeground: true, // Flag to indicate this click was handled in the foreground
                  },
                });

                notification.onclick = () => {
                  window.focus();
                  const url = payload.data?.url || "/";
                  if (url.startsWith("/")) window.location.href = url;
                  notification.close();
                };
              }
            });
          }
        }
      } catch (error) {
        console.error("An error occurred while retrieving token. ", error);
      }
    };

    requestPermissionAndGetToken();

    return () => {
      unsubscribe?.();
    };
  }, [enabled, userId]);

  return { fcmToken };
}
