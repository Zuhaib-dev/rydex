"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X } from "lucide-react";

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed in this session
    if (sessionStorage.getItem("pwa-install-dismissed")) return;

    // Detect iOS (Safari doesn't support beforeinstallprompt)
    const ua = window.navigator.userAgent;
    const isiOS = /iphone|ipad|ipod/i.test(ua);
    const isInStandaloneMode =
      ("standalone" in window.navigator && (window.navigator as any).standalone) ||
      window.matchMedia("(display-mode: standalone)").matches;

    if (isiOS && !isInStandaloneMode) {
      setIsIOS(true);
      // Show iOS guidance after a short delay
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    }

    // Chrome / Android / Edge
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShow(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShow(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
    sessionStorage.setItem("pwa-install-dismissed", "1");
  };

  if (dismissed) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: "spring", stiffness: 340, damping: 36 }}
          className="fixed bottom-4 left-4 right-4 z-999] sm:left-auto sm:right-4 sm:w-[340px]"
        >
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-2xl backdrop-blur-xl">
            <div className="flex items-start gap-3">
              {/* App Icon */}
              <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0 border border-zinc-700/50">
                <img src="/icon-192x192.png" alt="Rydex" className="w-full h-full object-cover" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-bold leading-tight">
                  Install Rydex App
                </p>
                {isIOS ? (
                  <p className="text-zinc-400 text-xs mt-0.5 leading-snug">
                    Tap <span className="text-white font-semibold">Share</span> then{" "}
                    <span className="text-white font-semibold">"Add to Home Screen"</span>
                  </p>
                ) : (
                  <p className="text-zinc-400 text-xs mt-0.5 leading-snug">
                    Get the full app experience — faster, offline-ready.
                  </p>
                )}
              </div>

              {/* Close */}
              <button
                onClick={handleDismiss}
                className="w-7 h-7 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center shrink-0 transition-colors"
              >
                <X size={12} className="text-zinc-400" />
              </button>
            </div>

            {!isIOS && (
              <button
                onClick={handleInstall}
                className="mt-3 w-full bg-white text-zinc-900 py-2.5 rounded-xl text-sm font-bold hover:bg-zinc-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Download size={15} />
                Install App
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
