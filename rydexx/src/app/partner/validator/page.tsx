"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { getSocket } from "@/lib/socket";
import { useNfc } from "@/hooks/useNfc";
import { useAudioListener } from "@/hooks/useAudioListener";
import { Html5Qrcode } from "html5-qrcode";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle, XCircle, Volume2, SmartphoneNfc, QrCode, ShieldCheck } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { PageHead, Panel } from "@/components/partner/shared";

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
    <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-8 relative">
      <style dangerouslySetInnerHTML={{ __html: `
        #qr-reader__dashboard_section_swaplink { display: none !important; }
        #qr-reader__dashboard_section_csr span { display: none !important; }
      `}} />

      <PageHead 
        code="VAL / 01" 
        title="Ticket Validator" 
        subtitle="Terminal ID: V-492" 
      />

      <Panel code="SCN / 02" title="Scanning Interface" className="relative overflow-hidden">
        {/* Status Overlays */}
        <AnimatePresence>
          {status === "success" && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-signal flex flex-col items-center justify-center p-6 text-center"
            >
              <CheckCircle size={80} className="text-background mb-4" />
              <h2 className="text-3xl font-bold text-background mb-2 tracking-widest uppercase">VERIFIED</h2>
              <p className="text-background/80 font-mono text-sm tracking-widest uppercase">{message}</p>
            </motion.div>
          )}

          {status === "error" && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-destructive flex flex-col items-center justify-center p-6 text-center"
            >
              <XCircle size={80} className="text-background mb-4" />
              <h2 className="text-3xl font-bold text-background mb-2 tracking-widest uppercase">INVALID TICKET</h2>
              <p className="text-background/80 font-mono text-sm tracking-widest uppercase">{message}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col">
          {/* Main Scanner Area */}
          <div className="h-[400px] bg-black relative border-b border-border overflow-hidden">
            {activeTab === "qr" && (
              <div className="relative w-full h-full flex flex-col items-center justify-center bg-black">
                <div id="qr-reader" className="w-full h-full [&>video]:object-cover" />
                <div className="absolute inset-0 border-[40px] border-black/80 pointer-events-none"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] border border-signal/50 pointer-events-none overflow-hidden flex items-start">
                  <motion.div 
                    animate={{ y: [0, 248, 0] }}
                    transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
                    className="w-full h-[2px] bg-signal shadow-[0_0_10px_var(--color-signal)]"
                  />
                </div>
                <div className="absolute bottom-4 text-signal font-mono text-[10px] tracking-widest uppercase bg-black/80 px-4 py-2 border border-signal/30 backdrop-blur-sm">
                  Awaiting QR Code
                </div>
              </div>
            )}

            {activeTab === "nfc" && (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-secondary/10">
                <button 
                  onClick={() => nfc.read(handleTokenScanned)}
                  disabled={!nfc.isSupported}
                  className={`w-32 h-32 flex items-center justify-center mb-6 relative transition-colors border ${
                    nfc.isSupported 
                      ? 'bg-signal/5 hover:bg-signal/10 border-signal/30 hover:border-signal cursor-pointer' 
                      : 'bg-secondary border-border opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className={`absolute inset-0 border border-signal/50 ${nfc.isReading ? 'animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]' : 'hidden'}`}></div>
                  <SmartphoneNfc size={48} className={nfc.isSupported ? "text-signal" : "text-muted-foreground"} />
                </button>
                <h3 className="text-xl font-bold mb-2 uppercase tracking-widest text-foreground">{nfc.isReading ? "Ready to Scan" : "Initialize Scanner"}</h3>
                <p className="font-mono text-xs tracking-widest uppercase text-muted-foreground mb-4">Hold passenger device near terminal</p>
                {!nfc.isSupported ? (
                  <p className="text-destructive font-mono text-[10px] tracking-widest uppercase bg-destructive/10 border border-destructive/20 px-4 py-3 text-center max-w-xs">
                    NFC module unavailable. Use fallback scanning methods.
                  </p>
                ) : nfc.error ? (
                  <p className="text-destructive font-mono text-[10px] tracking-widest uppercase bg-destructive/10 border border-destructive/20 px-4 py-3 text-center max-w-xs">
                    {nfc.error}
                  </p>
                ) : null}
              </div>
            )}

            {activeTab === "audio" && (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-secondary/10">
                <div className="w-32 h-32 bg-signal/5 border border-signal/30 flex items-center justify-center mb-6 relative">
                  <div className="absolute inset-0 border border-signal/50 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
                  <Volume2 size={48} className="text-signal" />
                </div>
                <h3 className="text-xl font-bold mb-2 uppercase tracking-widest text-foreground">Listening</h3>
                <p className="font-mono text-xs tracking-widest uppercase text-muted-foreground">Detecting high-frequency telemetry</p>
              </div>
            )}
            
            {status === "verifying" && (
              <div className="absolute inset-0 z-40 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center border border-signal/20">
                <div className="w-12 h-12 border-2 border-signal border-t-transparent animate-spin mb-6"></div>
                <p className="font-mono text-xs tracking-widest uppercase text-signal animate-pulse">Verifying Access...</p>
              </div>
            )}
          </div>

          {/* Mode Selector */}
          <div className="flex divide-x divide-border bg-secondary/5">
            <button
              onClick={() => setActiveTab("qr")}
              className={`flex-1 flex flex-col items-center justify-center py-4 transition-all ${
                activeTab === "qr" ? "bg-signal/10 text-signal border-b-2 border-b-signal" : "text-muted-foreground hover:bg-secondary/20 hover:text-foreground"
              }`}
            >
              <QrCode size={20} className="mb-2" />
              <span className="font-mono text-[10px] tracking-widest uppercase">Optical</span>
            </button>
            <button
              disabled={!nfc.isSupported}
              onClick={() => setActiveTab("nfc")}
              className={`flex-1 flex flex-col items-center justify-center py-4 transition-all ${
                activeTab === "nfc" ? "bg-signal/10 text-signal border-b-2 border-b-signal" : "text-muted-foreground hover:bg-secondary/20 hover:text-foreground"
              } ${!nfc.isSupported ? "opacity-30 cursor-not-allowed" : ""}`}
            >
              <SmartphoneNfc size={20} className="mb-2" />
              <span className="font-mono text-[10px] tracking-widest uppercase">NFC</span>
            </button>
            <button
              onClick={() => setActiveTab("audio")}
              className={`flex-1 flex flex-col items-center justify-center py-4 transition-all ${
                activeTab === "audio" ? "bg-signal/10 text-signal border-b-2 border-b-signal" : "text-muted-foreground hover:bg-secondary/20 hover:text-foreground"
              }`}
            >
              <Volume2 size={20} className="mb-2" />
              <span className="font-mono text-[10px] tracking-widest uppercase">Acoustic</span>
            </button>
          </div>
        </div>
      </Panel>
    </div>
  );
}

export default function ValidatorPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center mono text-[11px] tracking-[0.2em] uppercase text-muted-foreground">Initializing Terminal...</div>}>
      <ValidatorContent />
    </Suspense>
  );
}