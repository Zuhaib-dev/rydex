import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Share } from "lucide-react";

export default function InstallModal({ open, onClose, deferredPrompt }: { open: boolean, onClose: () => void, deferredPrompt: any }) {
  // Safe check for iOS since this runs on the client
  const isIOS = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  const handleInstall = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => {
        onClose();
      });
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-[90%] max-w-sm border border-border bg-card p-6 shadow-2xl"
          >
            <button onClick={onClose} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-5 w-5" />
            </button>
            <div className="h-12 w-12 border border-border bg-background grid place-items-center mb-5 tick relative">
              <Download className="h-5 w-5 text-signal" strokeWidth={2} />
              <div className="absolute top-0 left-0 w-1 h-1 border-t border-l border-foreground" />
              <div className="absolute top-0 right-0 w-1 h-1 border-t border-r border-foreground" />
              <div className="absolute bottom-0 left-0 w-1 h-1 border-b border-l border-foreground" />
              <div className="absolute bottom-0 right-0 w-1 h-1 border-b border-r border-foreground" />
            </div>
            
            <h2 className="font-serif text-3xl font-black mb-2 tracking-tight leading-none">Install Terminal</h2>
            
            {deferredPrompt ? (
              <>
                <p className="text-sm text-muted-foreground mb-6 font-mono tracking-wide leading-relaxed">
                  Install the Rydex dispatch terminal directly to your device for 24/7 native access.
                </p>
                <button 
                  onClick={handleInstall}
                  className="w-full group flex items-center justify-center gap-3 bg-signal text-bone font-mono text-[11px] tracking-[0.2em] uppercase py-3.5 hover:bg-ink transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Install App</span>
                </button>
              </>
            ) : isIOS ? (
              <div className="space-y-5 mt-4">
                <p className="text-xs text-muted-foreground font-mono tracking-[0.1em] uppercase">
                  ↳ Manual iOS Install required
                </p>
                <ol className="text-sm space-y-4 font-mono tracking-wide text-foreground">
                  <li className="flex items-center gap-3 border border-border p-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center bg-background text-xs text-muted-foreground">1</span>
                    <span>Tap the <Share className="h-4 w-4 inline mx-1 text-signal" /> Share button in Safari</span>
                  </li>
                  <li className="flex items-center gap-3 border border-border p-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center bg-background text-xs text-muted-foreground">2</span>
                    <span>Select <span className="text-signal">Add to Home Screen</span></span>
                  </li>
                </ol>
              </div>
            ) : (
              <div className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground font-mono tracking-wide border border-border p-4 bg-background">
                  Install the app via your browser's menu (usually top right corner ⋮) and select <span className="text-signal">"Install app"</span> or <span className="text-signal">"Add to Home screen"</span>.
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
