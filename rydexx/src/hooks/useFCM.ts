"use client";

import { useEffect, useState } from "react";
import { getToken } from "firebase/messaging";
import { initMessaging, VAPID_KEY } from "@/lib/firebase";

export function useFCM() {
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  useEffect(() => {
    const requestPermissionAndGetToken = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          const messaging = await initMessaging();
          if (messaging) {
            // Get token
            const token = await getToken(messaging, {
              vapidKey: VAPID_KEY,
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
          }
        }
      } catch (error) {
        console.error("An error occurred while retrieving token. ", error);
      }
    };

    requestPermissionAndGetToken();
  }, []);

  return { fcmToken };
}
