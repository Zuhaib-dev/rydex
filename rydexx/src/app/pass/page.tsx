"use client";

import { useState, useEffect, useCallback } from "react";
import { getSocket } from "@/lib/socket";
import { useNfc } from "@/hooks/useNfc";
import { useAudioChirp } from "@/hooks/useAudioChirp";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "motion/react";
import { Loader2, ShieldCheck, CreditCard, X, QrCode, Radio, SmartphoneNfc, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

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
      if (activeMode === "nfc" && nfc.isSupported) nfc.write(data.token);
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
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans p-6">
      <div className="max-w-md mx-auto space-y-8 mt-12">
        <header className="relative text-center flex items-center justify-center">
          <button 
            onClick={() => router.back()} 
            className="absolute left-0 p-2 bg-neutral-900 rounded-full hover:bg-neutral-800 transition text-neutral-400 hover:text-white"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white/90">My Passes</h1>
            <p className="text-neutral-400 mt-2">Manage your active subscriptions</p>
          </div>
        </header>

        {passes.map(pass => (
          <motion.div 
            key={pass._id}
            className="bg-linear-to-br from-indigo-500/20 to-purple-600/20 border border-white/10 rounded-3xl p-6 relative overflow-hidden backdrop-blur-xl"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <div className="absolute top-0 left-0 w-full h-full bg-noise opacity-10 pointer-events-none"></div>
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-linear-to-r from-indigo-300 to-purple-300">{pass.type}</h2>
                <p className="text-indigo-200/60 text-sm mt-1">Expires: {new Date(pass.expiresAt).toLocaleDateString()}</p>
              </div>
              {pass.balance > 0 ? (
                <div className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                  Active
                </div>
              ) : (
                <div className="bg-neutral-500/20 text-neutral-400 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-400"></span>
                  Ended
                </div>
              )}
            </div>

            <div className="flex justify-between items-end">
              <div>
                <p className="text-3xl font-mono tracking-tighter">{pass.balance}</p>
                <p className="text-xs text-neutral-400 uppercase tracking-widest mt-1">Rides Left</p>
              </div>
              <button 
                onClick={() => { setActivePassId(pass._id); setIsBoarding(true); }}
                disabled={pass.balance <= 0}
                className="bg-white text-black font-semibold px-6 py-3 rounded-full hover:bg-neutral-200 transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pass.balance > 0 ? "Tap to Board" : "Pass Ended"}
              </button>
            </div>
          </motion.div>
        ))}

        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 text-center space-y-6 shadow-xl mt-8">
          <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto">
            <ShieldCheck size={40} className="text-indigo-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">7-Day Commuter</h2>
            <p className="text-neutral-400 text-sm">Get 10 rides to use anytime within 7 days. Skip the payment process and simply tap your phone with the driver to ride.</p>
          </div>
          <div className="text-3xl font-black text-indigo-400 border-y border-neutral-800 py-4">
            ₹500 <span className="text-sm font-medium text-neutral-500 tracking-wide uppercase">/ 10 rides</span>
          </div>
          <button 
            onClick={handleBuyPass}
            disabled={buying}
            className="w-full bg-white text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors disabled:opacity-50"
          >
            {buying ? <Loader2 size={20} className="animate-spin" /> : <CreditCard size={20} />}
            {buying ? "Processing..." : "Purchase Pass Now"}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isBoarding && activePassId && (
          <motion.div 
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            className="fixed inset-0 z-50 bg-neutral-900/95 backdrop-blur-3xl flex flex-col items-center justify-center p-6"
          >
            <button 
              onClick={() => { setIsBoarding(false); setActivePassId(null); }}
              className="absolute top-8 right-8 p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition"
            >
              <X size={24} />
            </button>

            <h2 className="text-3xl font-bold mb-8 text-center bg-clip-text text-transparent bg-linear-to-r from-blue-400 to-emerald-400">
              Ready to Board
            </h2>

            <div className="bg-white p-4 rounded-2xl shadow-2xl mb-8 relative">
              {activeMode === "qr" && (
                token ? (
                  <QRCodeSVG value={token} size={240} className="rounded-xl" />
                ) : (
                  <div className="w-[240px] h-[240px] bg-neutral-100 animate-pulse rounded-xl flex items-center justify-center text-neutral-400">
                    Generating Token...
                  </div>
                )
              )}
              {activeMode === "nfc" && (
                <div className="w-[240px] h-[240px] bg-indigo-50 rounded-xl flex flex-col items-center justify-center text-indigo-500">
                  <SmartphoneNfc size={80} className="mb-4 animate-pulse" />
                  <span className="font-bold">Hold near Validator</span>
                </div>
              )}
              {activeMode === "audio" && (
                <div className="w-[240px] h-[240px] bg-blue-50 rounded-xl flex flex-col items-center justify-center text-blue-500">
                  <Radio size={80} className="mb-4 animate-ping" />
                  <span className="font-bold">Broadcasting...</span>
                </div>
              )}
              <div className="absolute -inset-4 border-2 border-emerald-500/30 rounded-4xl animate-pulse pointer-events-none"></div>
            </div>

            <p className="text-neutral-400 mb-8 max-w-xs text-center text-sm">
              Choose a validation method and present it to the terminal.
            </p>

            <div className="flex gap-4">
              <button 
                onClick={() => setActiveMode("qr")}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${
                  activeMode === "qr" ? "bg-emerald-500/20 border-emerald-500 text-emerald-300" : "border-white/20 text-neutral-400"
                }`}
              >
                <QrCode size={18} />
                <span className="text-sm font-medium">QR Code</span>
              </button>

              <button 
                onClick={() => setActiveMode("audio")}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${
                  activeMode === "audio" ? "bg-blue-500/20 border-blue-500 text-blue-300" : "border-white/20 text-neutral-400"
                }`}
              >
                <Radio size={18} />
                <span className="text-sm font-medium">Audio</span>
              </button>

              <button 
                onClick={() => setActiveMode("nfc")}
                disabled={!nfc.isSupported}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${
                  activeMode === "nfc" ? "bg-indigo-500/20 border-indigo-500 text-indigo-300" : "border-white/20 text-neutral-400"
                } ${!nfc.isSupported && "opacity-50 cursor-not-allowed"}`}
              >
                <SmartphoneNfc size={18} />
                <span className="text-sm font-medium">NFC</span>
              </button>
            </div>
            
            {error && (
              <div className="mt-8 flex items-center gap-2 text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">
                <AlertCircle size={20} />
                <span className="text-sm font-medium">{error}</span>
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
            className="fixed inset-0 z-60 bg-emerald-500 flex flex-col items-center justify-center p-6 text-white"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.5 }}
            >
              <CheckCircle size={120} className="mb-6 drop-shadow-2xl" />
            </motion.div>
            <h2 className="text-5xl font-extrabold tracking-tight mb-2 drop-shadow-md">Verified!</h2>
            <p className="text-emerald-100 font-medium text-lg">Have a great ride.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
