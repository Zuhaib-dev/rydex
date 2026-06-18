importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

const firebaseConfig = {
  apiKey: "AIzaSyBFVSa9GWdgZtxRKkg-TqG0P3Puw6guyhU",
  authDomain: "zuhaibx9.firebaseapp.com",
  projectId: "zuhaibx9",
  storageBucket: "zuhaibx9.firebasestorage.app",
  messagingSenderId: "710589441485",
  appId: "1:710589441485:web:c41d435d6da4dd605cd084",
  measurementId: "G-1YXG4W834T"
};

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );
  
  // If the payload already has a notification object, the browser will automatically
  // display it. Do not show another one to prevent duplicates!
  if (payload.notification) {
    console.log("[firebase-messaging-sw.js] Browser will display this notification automatically. Skipping manual display.");
    return;
  }

  // Customize notification here (for data-only messages)
  const notificationTitle = payload.data?.title || "New Message";
  const notificationOptions = {
    body: payload.data?.body || payload.data?.message || "You have a new update",
    icon: "/icon-192x192.png", // Use the app's icon
    badge: "/icon-96x96.png",
    data: payload.data || {}, // Optional data payload
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // If this is a native FCM background notification, let the Firebase SDK handler do the redirect
  if (event.notification.data && event.notification.data.FCM_MSG) {
    console.log("[firebase-messaging-sw.js] Native FCM click. Firebase SDK will handle the click action.");
    return;
  }

  // If this is a custom foreground notification click, let the page script handle the redirect
  if (event.notification.data && event.notification.data.isForeground) {
    console.log("[firebase-messaging-sw.js] Foreground notification click. Page script will handle the click action.");
    return;
  }

  const targetUrl = event.notification.data?.url || "/";
  const urlToOpen = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === urlToOpen && "focus" in client) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
 
