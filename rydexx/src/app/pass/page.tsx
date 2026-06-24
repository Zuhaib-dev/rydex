"use client";

import { useState, useEffect, useCallback } from "react";
import { getSocket } from "@/lib/socket";
import { useNfc } from "@/hooks/useNfc";
import { useAudioChirp } from "@/hooks/useAudioChirp";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "motion/react";
import { Loader2, ShieldCheck, CreditCard, X, QrCode, Radio, SmartphoneNfc, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { PageHead, Panel } from "@/components/partner/shared";

export default function PassPage() {
  const router = useRouter();
  const [passes, setPasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);

  const [activePassId, setActivePassId] = useState<string | null>(null);
  const [isBoarding, setIsBoarding] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<"qr" | "nfc" | "audio">("qr");

  const socket = getSocket();
  const nfc = useNfc();
  const audio = useAudioChirp();

  const fetchPasses = async () => {
    try {
      const res = await fetch("/api/pass/my-passes");
      const data = await res.json();
      if (data.success) {
        setPasses(data.passes);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPasses();
  }, []);

  const requestToken = useCallback(() => {
    if (activePassId) {
      socket.emit("request-pass-token", { passId: activePassId });
    }
  }, [socket, activePassId]);

  useEffect(() => {
    const onTokenResponse = (data: { token: string; expiresAt: number }) => {
      setToken(data.token);
      if (activeMode === "audio") audio.broadcastToken(data.token);
    };
    const onTokenError = (data: { message: string }) => setError(data.message);
    const onValidationSuccess = (data: { passId: string; newBalance: number; message: string }) => {
      if (data.passId === activePassId) {
        setIsVerified(true);
        setIsBoarding(false);
        fetchPasses(); // refresh pass data to show new balance
        setTimeout(() => setIsVerified(false), 5000);
      }
    };

    socket.on("pass-token-response", onTokenResponse);
    socket.on("pass-token-error", onTokenError);
    socket.on("validation:success", onValidationSuccess);
    return () => {
      socket.off("pass-token-response", onTokenResponse);
      socket.off("pass-token-error", onTokenError);
      socket.off("validation:success", onValidationSuccess);
    };
  }, [socket, isBoarding, activeMode, nfc, audio, activePassId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isBoarding && !isVerified && activePassId) {
      requestToken();
      interval = setInterval(requestToken, 10000);
    }
    return () => clearInterval(interval);
  }, [isBoarding, isVerified, requestToken, activePassId]);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleBuyPass = async () => {
    setBuying(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) return alert("Failed to load Razorpay");

      const res = await fetch("/api/pass/purchase/create", { method: "POST" });
      const order = await res.json();
      if (order.error) throw new Error(order.error);

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY,
        amount: order.amount,
        currency: "INR",
        name: "RYDEX Passes",
        description: "7-Day Commuter Pass",
        order_id: order.orderId,
        handler: async (response: any) => {
          const verify = await fetch("/api/pass/purchase/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response)
          });
          const result = await verify.json();
          if (result.success) {
            fetchPasses();
          } else {
            alert("Verification failed");
          }
        }
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      alert("Purchase failed: " + err.message);
    } finally {
      setBuying(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-8 flex items-center justify-center min-h-[50vh]">
        <div className="p-8 text-center mono text-[11px] tracking-[0.2em] uppercase text-muted-foreground flex items-center"><Loader2 className="animate-spin mr-2" size={16} />Loading Pass Data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-8 relative">
      <PageHead 
        code="USR / 02" 
        title="My Passes" 
        subtitle="Manage your active subscriptions" 
      />

      {passes.filter(p => p.balance > 0).length > 0 && (
        <Panel code="SUB / 01" title="Active Subscriptions">
          <div className="space-y-4 p-6">
            {passes.filter(p => p.balance > 0).map(pass => (
              <div 
                key={pass._id}
                className="border border-border bg-secondary/10 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6"
              >
                <div>
                  <h2 className="text-2xl font-bold tracking-widest uppercase text-foreground mb-1">{pass.type}</h2>
                  <p className="text-muted-foreground font-mono text-[11px] tracking-widest uppercase">Expires: {new Date(pass.expiresAt).toLocaleDateString()}</p>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-center sm:text-right">
                    <p className="text-4xl font-bold tracking-tighter text-foreground">{pass.balance}</p>
                    <p className="text-[10px] text-signal uppercase tracking-widest mt-1 font-bold">Rides Left</p>
                  </div>
                  <button 
                    onClick={() => { setActivePassId(pass._id); setIsBoarding(true); }}
                    className="brick px-6 py-4 font-mono text-xs tracking-[0.2em] uppercase hover:bg-signal transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    Tap to Board
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {passes.filter(p => p.balance <= 0).length > 0 && (
        <Panel code="HST / 01" title="Past Passes">
          <div className="divide-y divide-border">
            {passes.filter(p => p.balance <= 0).map(pass => (
              <div 
                key={pass._id}
                className="p-6 flex items-center justify-between bg-background opacity-60 grayscale"
              >
                <div>
                  <h3 className="text-lg font-bold uppercase tracking-widest text-foreground">{pass.type}</h3>
                  <p className="text-muted-foreground font-mono text-[10px] mt-1 tracking-widest uppercase">Ended: {new Date(pass.expiresAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <span className="bg-secondary/50 text-muted-foreground px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] font-bold border border-border">Exhausted</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Panel code="PRC / 01" title="Available Plans">
        <div className="p-8 flex flex-col md:flex-row items-center justify-between gap-8 bg-secondary/5">
          <div className="flex-1 text-center md:text-left space-y-4">
            <div className="w-16 h-16 bg-signal/10 flex items-center justify-center border border-signal/30 mx-auto md:mx-0">
              <ShieldCheck size={32} className="text-signal" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2 tracking-widest uppercase">7-Day Commuter</h2>
              <p className="text-muted-foreground font-mono text-[11px] tracking-widest uppercase max-w-md">Get 10 rides to use anytime within 7 days. Skip the payment process and simply tap your phone with the driver to ride.</p>
            </div>
          </div>
          
          <div className="flex flex-col items-center md:items-end gap-4 w-full md:w-auto border-t md:border-t-0 md:border-l border-border pt-6 md:pt-0 md:pl-8">
            <div className="text-3xl font-bold text-foreground">
              ₹500 <span className="text-[11px] font-mono text-muted-foreground tracking-widest uppercase">/ 10 rides</span>
            </div>
            <button 
              onClick={handleBuyPass}
              disabled={buying}
              className="brick w-full md:w-auto px-8 py-4 font-mono text-xs tracking-[0.2em] uppercase hover:bg-signal transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {buying ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
              {buying ? "Processing" : "Purchase Pass"}
            </button>
          </div>
        </div>
      </Panel>

      <AnimatePresence>
        {isBoarding && activePassId && (
          <motion.div 
            initial={{ opacity: 0, y: "10%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "10%" }}
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col items-center justify-center p-6 border-4 border-signal m-4"
          >
            <button 
              onClick={() => { setIsBoarding(false); setActivePassId(null); }}
              className="absolute top-6 right-6 p-2 bg-secondary border border-border text-foreground hover:bg-secondary/80 transition uppercase text-[10px] tracking-widest font-mono"
            >
              Close
            </button>

            <h2 className="text-3xl font-bold mb-8 text-center uppercase tracking-widest text-foreground">
              Ready to Board
            </h2>

            <div className="bg-black p-4 border border-border shadow-2xl mb-8 relative">
              {activeMode === "qr" && (
                token ? (
                  <QRCodeSVG value={token} size={240} className="bg-white p-2" />
                ) : (
                  <div className="w-[240px] h-[240px] bg-secondary flex items-center justify-center font-mono text-[10px] tracking-widest uppercase text-muted-foreground border border-border">
                    Generating Token...
                  </div>
                )
              )}
              {activeMode === "nfc" && (
                <button 
                  onClick={() => { if (token) nfc.write(token) }}
                  className="w-[240px] h-[240px] bg-secondary/10 flex flex-col items-center justify-center text-signal cursor-pointer hover:bg-signal/5 transition border border-signal/30 hover:border-signal"
                >
                  <SmartphoneNfc size={80} className={`mb-4 ${nfc.isWriting ? 'animate-pulse' : ''}`} />
                  <span className="font-mono text-[10px] tracking-widest uppercase">{nfc.isWriting ? "Ready... Tap Terminal" : "Transmit via NFC"}</span>
                </button>
              )}
              {activeMode === "audio" && (
                <div className="w-[240px] h-[240px] bg-secondary/10 flex flex-col items-center justify-center text-signal border border-signal/30">
                  <Radio size={80} className="mb-4 animate-ping" />
                  <span className="font-mono text-[10px] tracking-widest uppercase">Broadcasting...</span>
                </div>
              )}
            </div>

            <p className="text-muted-foreground mb-8 max-w-xs text-center font-mono text-[10px] tracking-widest uppercase">
              Choose a validation method and present it to the terminal.
            </p>

            <div className="flex gap-4">
              <button 
                onClick={() => setActiveMode("qr")}
                className={`flex items-center gap-2 px-4 py-3 border transition-all uppercase font-mono text-[10px] tracking-widest ${
                  activeMode === "qr" ? "bg-signal/20 border-signal text-signal" : "bg-secondary/10 border-border text-muted-foreground hover:bg-secondary/30 hover:text-foreground"
                }`}
              >
                <QrCode size={14} />
                Optical
              </button>

              <button 
                onClick={() => setActiveMode("audio")}
                className={`flex items-center gap-2 px-4 py-3 border transition-all uppercase font-mono text-[10px] tracking-widest ${
                  activeMode === "audio" ? "bg-signal/20 border-signal text-signal" : "bg-secondary/10 border-border text-muted-foreground hover:bg-secondary/30 hover:text-foreground"
                }`}
              >
                <Radio size={14} />
                Acoustic
              </button>

              <button 
                onClick={() => setActiveMode("nfc")}
                disabled={!nfc.isSupported}
                className={`flex items-center gap-2 px-4 py-3 border transition-all uppercase font-mono text-[10px] tracking-widest ${
                  activeMode === "nfc" ? "bg-signal/20 border-signal text-signal" : "bg-secondary/10 border-border text-muted-foreground hover:bg-secondary/30 hover:text-foreground"
                } ${!nfc.isSupported && "opacity-30 cursor-not-allowed"}`}
              >
                <SmartphoneNfc size={14} />
                NFC
              </button>
            </div>

            {!nfc.isSupported && (
              <p className="mt-6 font-mono text-[10px] tracking-widest text-destructive border border-destructive/20 bg-destructive/5 px-4 py-3 text-center max-w-xs uppercase">
                NFC not supported by device. Use Optical or Acoustic.
              </p>
            )}
            
            {error && (
              <div className="mt-8 flex items-center gap-3 text-destructive bg-destructive/10 border border-destructive/20 px-6 py-4">
                <AlertCircle size={20} />
                <span className="font-mono text-xs tracking-widest uppercase">{error}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isVerified && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="fixed inset-0 z-60 bg-signal flex flex-col items-center justify-center p-6 m-4 border-4 border-background"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.5 }}
            >
              <CheckCircle size={100} className="mb-6 text-background" />
            </motion.div>
            <h2 className="text-4xl font-bold tracking-widest uppercase mb-4 text-background">Verified</h2>
            <p className="text-background/80 font-mono text-sm tracking-widest uppercase">Authorization Complete</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
