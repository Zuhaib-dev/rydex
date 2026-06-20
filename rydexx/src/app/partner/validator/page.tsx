"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { getSocket } from "@/lib/socket";
import { useNfc } from "@/hooks/useNfc";
import { useAudioListener } from "@/hooks/useAudioListener";
import { Html5Qrcode } from "html5-qrcode";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle, XCircle, Volume2, SmartphoneNfc, QrCode, ShieldCheck } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";

function ValidatorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId");

  const [status, setStatus] = useState<"idle" | "verifying" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"qr" | "nfc" | "audio">("qr");

  const socket = getSocket();
  const nfc = useNfc();
  const audio = useAudioListener();

  const handleTokenScanned = useCallback((token: string) => {
    if (status === "verifying") return;
    setStatus("verifying");
    socket.emit("verify-pass", token);
  }, [status, socket]);

  useEffect(() => {
    socket.emit("join-validator");

    const onSuccess = async (data: { passId: string; newBalance: number; message: string }) => {
      setStatus("success");
      setMessage(`${data.message} - ${data.newBalance} rides left`);
      
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);

      if (bookingId) {
        try {
          await fetch("/api/partner/bookings/complete-pass-ride", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookingId })
          });
        } catch (err) {
          console.error("Failed to complete pass ride", err);
        }
      }

      setTimeout(() => {
        setStatus("idle");
        if (bookingId) {
          router.push("/partner/active-ride");
        }
      }, 3000);
    };

    const onError = (data: { message: string }) => {
      setStatus("error");
      setMessage(data.message);
      
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(150, audioCtx.currentTime);
      
      gain.gain.setValueAtTime(1, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);

      setTimeout(() => setStatus("idle"), 4000);
    };

    socket.on("validation:success", onSuccess);
    socket.on("validation:failure", onError);

    return () => {
      socket.off("validation:success", onSuccess);
      socket.off("validation:failure", onError);
    };
  }, [socket, bookingId, router]);

  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    let isComponentMounted = true;

    if (activeTab === "qr") {
      html5QrCode = new Html5Qrcode("qr-reader");
      
      html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1 },
        (decodedText) => {
          handleTokenScanned(decodedText);
          if (html5QrCode?.getState() === 2) { // 2 = SCANNING
            html5QrCode.pause();
            setTimeout(() => {
              if (isComponentMounted && html5QrCode?.getState() === 3) { // 3 = PAUSED
                html5QrCode.resume();
              }
            }, 3000);
          }
        },
        () => {} // ignore frame errors
      ).catch((err) => {
        console.error("QR Scanner Start Error:", err);
      });

      return () => {
        isComponentMounted = false;
        if (html5QrCode && html5QrCode.isScanning) {
          html5QrCode.stop().then(() => {
            html5QrCode?.clear();
          }).catch(console.error);
        }
      };
    }
  }, [activeTab, handleTokenScanned]);

  // NFC reading is now started explicitly via a button click to satisfy Web API user gesture requirements

  useEffect(() => {
    if (activeTab === "audio") {
      audio.startListening(handleTokenScanned);
      return () => {
        audio.stopListening();
      };
    }
  }, [activeTab, audio.startListening, audio.stopListening, handleTokenScanned]);

  return (
    <div className="min-h-screen bg-neutral-900 text-white font-sans flex flex-col">
      <style dangerouslySetInnerHTML={{ __html: `
        #qr-reader__dashboard_section_swaplink { display: none !important; }
        #qr-reader__dashboard_section_csr span { display: none !important; }
      `}} />
      <header className="bg-neutral-950 p-4 shadow-md flex items-center justify-between z-10">
        <div className="flex items-center gap-2 text-emerald-400">
          <ShieldCheck size={28} />
          <h1 className="text-xl font-bold tracking-tight text-white">Ticket Validator</h1>
        </div>
        <div className="text-xs font-mono px-2 py-1 bg-neutral-800 rounded-md text-neutral-400">
          Terminal ID: V-492
        </div>
      </header>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Status Overlays */}
        <AnimatePresence>
          {status === "success" && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="absolute inset-0 z-50 bg-emerald-500 flex flex-col items-center justify-center p-6 text-center"
            >
              <CheckCircle size={100} className="text-white drop-shadow-xl mb-4" />
              <h2 className="text-4xl font-extrabold text-white mb-2 shadow-sm">VERIFIED</h2>
              <p className="text-emerald-100 font-medium text-lg bg-emerald-900/30 px-4 py-2 rounded-lg">{message}</p>
            </motion.div>
          )}

          {status === "error" && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="absolute inset-0 z-50 bg-red-600 flex flex-col items-center justify-center p-6 text-center"
            >
              <XCircle size={100} className="text-white drop-shadow-xl mb-4" />
              <h2 className="text-4xl font-extrabold text-white mb-2 shadow-sm">INVALID TICKET</h2>
              <p className="text-red-100 font-medium text-lg bg-red-900/30 px-4 py-2 rounded-lg">{message}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 p-6 flex flex-col max-w-lg mx-auto w-full">
          {/* Main Scanner Area */}
          <div className="flex-1 bg-neutral-800 rounded-3xl overflow-hidden border border-neutral-700 shadow-2xl relative">
            {activeTab === "qr" && (
              <div className="relative w-full h-full flex flex-col items-center justify-center bg-black">
                <div id="qr-reader" className="w-full h-full [&>video]:object-cover" />
                <div className="absolute inset-0 border-30 border-black/60 pointer-events-none"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] border-2 border-emerald-500/50 rounded-3xl pointer-events-none overflow-hidden flex items-start">
                  <motion.div 
                    animate={{ y: [0, 248, 0] }}
                    transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
                    className="w-full h-[3px] bg-emerald-400 shadow-[0_0_15px_#34d399]"
                  />
                </div>
                <p className="absolute bottom-8 text-neutral-300 text-sm font-semibold px-5 py-2.5 bg-black/70 rounded-full backdrop-blur-md shadow-2xl">
                  Point camera at the QR code
                </p>
              </div>
            )}

            {activeTab === "nfc" && (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-linear-to-b from-neutral-800 to-indigo-900/40">
                <button 
                  onClick={() => nfc.read(handleTokenScanned)}
                  disabled={!nfc.isSupported}
                  className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 relative transition-colors border-[3px] ${
                    nfc.isSupported 
                      ? 'bg-indigo-500/20 hover:bg-indigo-500/30 border-transparent hover:border-indigo-400 cursor-pointer' 
                      : 'bg-neutral-800 border-neutral-700 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className={`absolute inset-0 rounded-full border-[3px] border-indigo-500/30 ${nfc.isReading ? 'animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]' : 'hidden'}`}></div>
                  <SmartphoneNfc size={48} className={nfc.isSupported ? "text-indigo-400" : "text-neutral-500"} />
                </button>
                <h3 className="text-2xl font-bold mb-2">{nfc.isReading ? "Ready to Scan" : "Click to Start Scanner"}</h3>
                <p className="text-neutral-400 mb-4">Hold passenger's phone near the terminal</p>
                {!nfc.isSupported && (
                  <p className="text-red-400 mt-2 text-xs font-semibold bg-red-500/10 px-4 py-3 rounded-xl text-center max-w-xs">
                    NFC is not supported by your browser or device. Please use the QR Code or Audio scanner instead.
                  </p>
                )}
              </div>
            )}

            {activeTab === "audio" && (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-linear-to-b from-neutral-800 to-blue-900/40">
                <div className="w-32 h-32 rounded-full bg-blue-500/20 flex items-center justify-center mb-6 relative">
                  <div className="absolute inset-0 rounded-full border-[3px] border-blue-500/30 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
                  <Volume2 size={48} className="text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Listening...</h3>
                <p className="text-neutral-400">Detecting high-frequency ticket signals</p>
              </div>
            )}
            
            {status === "verifying" && (
              <div className="absolute inset-0 z-40 bg-neutral-900/80 backdrop-blur-sm flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="font-semibold text-emerald-400 animate-pulse">Verifying Pass...</p>
              </div>
            )}
          </div>

          {/* Mode Selector */}
          <div className="mt-6 flex bg-neutral-800 p-2 rounded-2xl gap-2">
            <button
              onClick={() => setActiveTab("qr")}
              className={`flex-1 flex flex-col items-center py-3 rounded-xl transition-all ${
                activeTab === "qr" ? "bg-neutral-700 text-white shadow-md" : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              <QrCode size={24} className="mb-1" />
              <span className="text-xs font-semibold">QR Scan</span>
            </button>
            <button
              disabled={!nfc.isSupported}
              onClick={() => setActiveTab("nfc")}
              className={`flex-1 flex flex-col items-center py-3 rounded-xl transition-all ${
                activeTab === "nfc" ? "bg-indigo-600/30 text-indigo-300 shadow-md" : "text-neutral-500 hover:text-neutral-300"
              } ${!nfc.isSupported ? "opacity-30 cursor-not-allowed" : ""}`}
            >
              <SmartphoneNfc size={24} className="mb-1" />
              <span className="text-xs font-semibold">NFC</span>
            </button>
            <button
              onClick={() => setActiveTab("audio")}
              className={`flex-1 flex flex-col items-center py-3 rounded-xl transition-all ${
                activeTab === "audio" ? "bg-blue-600/30 text-blue-300 shadow-md" : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              <Volume2 size={24} className="mb-1" />
              <span className="text-xs font-semibold">Audio</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ValidatorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-900 flex items-center justify-center text-white">Loading...</div>}>
      <ValidatorContent />
    </Suspense>
  );
}
