"use client";

import { useState, useEffect, useCallback } from "react";
import { getSocket } from "@/lib/socket";
import { useNfc } from "@/hooks/useNfc";
import { useAudioChirp } from "@/hooks/useAudioChirp";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "motion/react";
import { QrCode, Radio, SmartphoneNfc, AlertCircle, CheckCircle } from "lucide-react";

export default function PassValidationOverlay({ bookingId }: { bookingId: string }) {
  const [activePassId, setActivePassId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<"qr" | "nfc" | "audio">("qr");
  const [validationStatus, setValidationStatus] = useState<"idle" | "success">("idle");
  const [successMessage, setSuccessMessage] = useState("");

  const socket = getSocket();
  const nfc = useNfc();
  const audio = useAudioChirp();

  useEffect(() => {
    fetch("/api/pass/my-passes")
      .then(res => res.json())
      .then(data => {
        if (data.success && data.passes) {
          const validPass = data.passes.find((p: any) => p.balance > 0);
          if (validPass) {
            setActivePassId(validPass._id);
          }
        }
      })
      .catch(console.error);
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
      setValidationStatus("success");
      setSuccessMessage(`${data.message} - ${data.newBalance} rides left`);
    };

    socket.on("pass-token-response", onTokenResponse);
    socket.on("pass-token-error", onTokenError);
    socket.on("validation:success", onValidationSuccess);
    return () => {
      socket.off("pass-token-response", onTokenResponse);
      socket.off("pass-token-error", onTokenError);
      socket.off("validation:success", onValidationSuccess);
    };
  }, [socket, activeMode, nfc, audio]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activePassId) {
      requestToken();
      interval = setInterval(requestToken, 10000);
    }
    return () => clearInterval(interval);
  }, [requestToken, activePassId]);

  if (!activePassId) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: "100%" }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed inset-0 z-999 bg-neutral-900/95 backdrop-blur-3xl flex flex-col items-center justify-center p-6"
    >
      <h2 className="text-3xl font-bold mb-8 text-center bg-clip-text text-transparent bg-linear-to-r from-blue-400 to-emerald-400">
        {validationStatus === "success" ? "Validated!" : "Tap or Scan to Pay"}
      </h2>

      {validationStatus === "success" ? (
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center justify-center space-y-6 mb-8">
          <CheckCircle size={120} className="text-emerald-400" />
          <h2 className="text-4xl font-black text-emerald-400 tracking-tight">Verified</h2>
          <p className="text-neutral-300 font-medium text-lg text-center max-w-sm">{successMessage}</p>
        </motion.div>
      ) : (
        <>
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
              <button 
                onClick={() => { if (token) nfc.write(token) }}
                className="w-[240px] h-[240px] bg-indigo-50 rounded-xl flex flex-col items-center justify-center text-indigo-500 cursor-pointer hover:bg-indigo-100 transition border-2 border-transparent hover:border-indigo-300"
              >
                <SmartphoneNfc size={80} className={`mb-4 ${nfc.isWriting ? 'animate-pulse' : ''}`} />
                <span className="font-bold">{nfc.isWriting ? "Ready... Tap Terminal" : "Click to Transmit via NFC"}</span>
              </button>
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
            Driver has ended the ride. Choose a validation method and present it to the terminal.
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
        </>
      )}
      
      {error && (
        <div className="mt-8 flex items-center gap-2 text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">
          <AlertCircle size={20} />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}
    </motion.div>
  );
}
