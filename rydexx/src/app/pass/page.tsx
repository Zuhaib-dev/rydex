"use client";

import { useState, useEffect, useCallback } from "react";
import { getSocket } from "@/lib/socket";
import { useNfc } from "@/hooks/useNfc";
import { useAudioChirp } from "@/hooks/useAudioChirp";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "motion/react";
import { ShieldCheck, Wifi, Radio, SmartphoneNfc, AlertCircle, X, CheckCircle } from "lucide-react";

const MOCK_PASS_ID = "60b9b3b3e6b3a3b3e6b3a3b3"; // Valid ObjectId mock

export default function PassPage() {
  const [isBoarding, setIsBoarding] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useAudio, setUseAudio] = useState(true);
  const [useNfcBroadcast, setUseNfcBroadcast] = useState(false);

  const socket = getSocket();
  const nfc = useNfc();
  const audio = useAudioChirp();

  const requestToken = useCallback(() => {
    socket.emit("request-pass-token", { passId: MOCK_PASS_ID });
  }, [socket]);

  useEffect(() => {
    // Authenticate socket using a mocked user ID for the demo if real auth isn't active
    // In a real app, this happens globally
    // socket.emit("identity", "mock_user_id");

    const onTokenResponse = (data: { token: string; expiresAt: number }) => {
      setToken(data.token);
      if (isBoarding) {
        if (useNfcBroadcast && nfc.isSupported) {
          nfc.write(data.token);
        }
        if (useAudio) {
          audio.broadcastToken(data.token);
        }
      }
    };

    const onTokenError = (data: { message: string }) => {
      setError(data.message);
    };

    const onValidationSuccess = (data: { passId: string; newBalance: number; message: string }) => {
      if (data.passId === MOCK_PASS_ID) {
        setIsVerified(true);
        setIsBoarding(false);
        // Reset after 5s
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
  }, [socket, isBoarding, useAudio, useNfcBroadcast, nfc, audio]);

  // Refresh token every 10 seconds while boarding
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isBoarding && !isVerified) {
      requestToken(); // Initial fetch
      interval = setInterval(requestToken, 10000);
    }
    return () => clearInterval(interval);
  }, [isBoarding, isVerified, requestToken]);

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans p-6">
      {/* Dashboard */}
      <div className="max-w-md mx-auto space-y-8 mt-12">
        <header className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white/90">My Passes</h1>
          <p className="text-neutral-400 mt-2">Manage your active subscriptions</p>
        </header>

        <motion.div 
          className="bg-linear-to-br from-indigo-500/20 to-purple-600/20 border border-white/10 rounded-3xl p-6 relative overflow-hidden backdrop-blur-xl"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <div className="absolute top-0 left-0 w-full h-full bg-noise opacity-10 pointer-events-none"></div>
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-linear-to-r from-indigo-300 to-purple-300">7-Day Commuter</h2>
              <p className="text-indigo-200/60 text-sm mt-1">Unlimited City Rides</p>
            </div>
            <div className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
              Active
            </div>
          </div>

          <div className="flex justify-between items-end">
            <div>
              <p className="text-3xl font-mono tracking-tighter">14</p>
              <p className="text-xs text-neutral-400 uppercase tracking-widest mt-1">Rides Left</p>
            </div>
            <button 
              onClick={() => setIsBoarding(true)}
              className="bg-white text-black font-semibold px-6 py-3 rounded-full hover:bg-neutral-200 transition-colors active:scale-95"
            >
              Tap to Board
            </button>
          </div>
        </motion.div>
      </div>

      {/* Boarding Overlay */}
      <AnimatePresence>
        {isBoarding && (
          <motion.div 
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            className="fixed inset-0 z-50 bg-neutral-900/95 backdrop-blur-3xl flex flex-col items-center justify-center p-6"
          >
            <button 
              onClick={() => setIsBoarding(false)}
              className="absolute top-8 right-8 p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition"
            >
              <X size={24} />
            </button>

            <h2 className="text-3xl font-bold mb-8 text-center bg-clip-text text-transparent bg-linear-to-r from-blue-400 to-emerald-400">
              Ready to Board
            </h2>

            <div className="bg-white p-4 rounded-2xl shadow-2xl mb-8 relative">
              {token ? (
                <QRCodeSVG value={token} size={240} className="rounded-xl" />
              ) : (
                <div className="w-[240px] h-[240px] bg-neutral-100 animate-pulse rounded-xl flex items-center justify-center text-neutral-400">
                  Generating Token...
                </div>
              )}
              <div className="absolute -inset-4 border-2 border-emerald-500/30 rounded-4xl animate-pulse pointer-events-none"></div>
            </div>

            <p className="text-neutral-400 mb-8 max-w-xs text-center text-sm">
              Hold your phone near the validator or show this dynamic QR code to the driver.
            </p>

            <div className="flex gap-4">
              <button 
                onClick={() => setUseAudio(!useAudio)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${
                  useAudio ? "bg-blue-500/20 border-blue-500 text-blue-300" : "border-white/20 text-neutral-400"
                }`}
              >
                <Radio size={18} />
                <span className="text-sm font-medium">Audio Chirp</span>
              </button>

              <button 
                onClick={() => setUseNfcBroadcast(!useNfcBroadcast)}
                disabled={!nfc.isSupported}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${
                  useNfcBroadcast ? "bg-indigo-500/20 border-indigo-500 text-indigo-300" : "border-white/20 text-neutral-400"
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

      {/* Success Overlay */}
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
