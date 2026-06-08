"use client";

import { useEffect, useState } from "react";
import { getToken, onMessage } from "firebase/messaging";
import { initMessaging, VAPID_KEY } from "@/lib/firebase";

export function useFCM() {
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  useEffect(() => {
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
                  data: payload.data,
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
  }, []);

  return { fcmToken };
}
