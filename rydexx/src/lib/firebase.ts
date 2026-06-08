import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyBFVSa9GWdgZtxRKkg-TqG0P3Puw6guyhU",
  authDomain: "zuhaibx9.firebaseapp.com",
  projectId: "zuhaibx9",
  storageBucket: "zuhaibx9.firebasestorage.app",
  messagingSenderId: "710589441485",
  appId: "1:710589441485:web:c41d435d6da4dd605cd084",
  measurementId: "G-1YXG4W834T"
};

// Initialize Firebase once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const initMessaging = async () => {
  if (typeof window !== "undefined") {
    const supported = await isSupported();
    if (supported) {
      return getMessaging(app);
    }
  }
  return null;
};

export const VAPID_KEY = "BOVRV-KRX8NR3BYi4l57KzAvb4-J_WV2NHkYy4zu2eX7uALQTJLPthNahkYdN5EM40nyWOJ07HZVDTFFsCkOxdU";
