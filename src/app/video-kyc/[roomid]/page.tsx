"use client";

import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { motion, AnimatePresence } from "motion/react";
import {
  Video,
  VideoOff,
  PhoneOff,
  ShieldCheck,
  XCircle,
  Loader2,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";

type CallState = "idle" | "connecting" | "live" | "ended";

export default function VideoKYCRoom() {
  const { roomid } = useParams<{ roomid: string }>();
  const { userData } = useSelector((state: RootState) => state.user);
  const containerRef = useRef<HTMLDivElement>(null);
  const zpRef = useRef<any>(null);
  const router = useRouter();

  const [callState, setCallState] = useState<CallState>("idle");
  const [showPostCall, setShowPostCall] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [postCallLoading, setPostCallLoading] = useState(false);
  const [postCallError, setPostCallError] = useState("");
  const [postCallDone, setPostCallDone] = useState<"approved" | "rejected" | null>(null);

  const isAdmin = userData?.role === "admin";

  // Extract partner ID from roomId ("kyc-{partnerId}-{timestamp}")
  const partnerId = roomid?.split("-").slice(1, -1).join("-") ?? "";

  const startCall = async () => {
    if (!containerRef.current || !roomid) return;
    setCallState("connecting");

    try {
      const { ZegoUIKitPrebuilt } = await import(
        "@zegocloud/zego-uikit-prebuilt"
      );

      const appId = Number(process.env.NEXT_PUBLIC_ZEGO_APP_ID);
      const serverSecret = process.env.NEXT_PUBLIC_ZEGO_SERVER_SECRET;

      if (!appId || !serverSecret) {
        console.error("Missing Zego environment variables!");
        setCallState("idle");
        return;
      }

      const userID =
        userData?._id?.toString() || Math.random().toString(36).substring(7);
      const userName = userData?.name || `Guest-${userID}`;

      const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
        appId,
        serverSecret,
        roomid,
        userID,
        userName
      );

      const zp = ZegoUIKitPrebuilt.create(kitToken);
      zpRef.current = zp;
      setCallState("live");

      zp.joinRoom({
        container: containerRef.current,
        showPreJoinView: false,
        showMyCameraToggleButton: true,
        showMyMicrophoneToggleButton: true,
        showAudioVideoSettingsButton: true,
        showScreenSharingButton: false,
        showUserList: false,
        showTextChat: false,
        scenario: {
          mode: ZegoUIKitPrebuilt.OneONoneCall,
        },
        onLeaveRoom: () => {
          setCallState("ended");
          setShowPostCall(isAdmin);
        },
      });
    } catch (error) {
      console.error("Zego Error:", error);
      setCallState("idle");
    }
  };

  // Auto-start on mount + Security check
  useEffect(() => {
    if (userData) {
      // Allow the partner to join the room they were navigated to.
      // The Zego token will handle basic security.
      startCall();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData, roomid]);

  const handlePostCall = async (action: "approved" | "rejected") => {
    if (!partnerId) return;
    // Reject requires a reason
    if (action === "rejected" && !rejectionReason.trim()) {
      setPostCallError("Please provide a reason before rejecting.");
      return;
    }
    setPostCallLoading(true);
    setPostCallError("");
    try {
      await axios.post(`/api/admin/video-kyc/complete/${partnerId}`, {
        action,
        reason: rejectionReason.trim() || undefined,
      });
      setPostCallDone(action);
      // Redirect admin to home after a short delay so they see the verdict screen
      setTimeout(() => router.push("/"), 2000);
    } catch {
      setPostCallError("Something went wrong. Please try again.");
    } finally {
      setPostCallLoading(false);
    }
  };

  return (
    <div className="h-screen bg-[#0a0a0a] flex flex-col overflow-hidden">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(isAdmin ? "/" : "/partner")}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition text-white/60 hover:text-white"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-white font-black text-sm uppercase tracking-widest">
                Video KYC
              </h1>
              <span className="w-1 h-1 bg-white/20 rounded-full" />
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white/5 border border-white/10 rounded-md">
                <span className={`text-[10px] font-black uppercase tracking-wider ${isAdmin ? 'text-violet-400' : 'text-gray-400'}`}>
                  {userData?.role || 'User'}
                </span>
              </div>
            </div>
            <p className="text-white/40 text-[11px] font-medium mt-0.5">
              Signed in as <span className="text-white/70 font-bold">{userData?.name || 'Guest'}</span>
            </p>
          </div>
        </div>

        {/* Live Pill */}
        <AnimatePresence>
          {callState === "live" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-full"
            >
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-2 h-2 bg-red-500 rounded-full"
              />
              <span className="text-red-400 text-xs font-black uppercase tracking-widest">
                Live
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Video Area */}
      <div className="flex-1 relative">
        {/* Connecting State */}
        <AnimatePresence>
          {callState === "connecting" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-[#0a0a0a]"
            >
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-2 border-white/10 flex items-center justify-center">
                  <Video className="text-white/40" size={32} />
                </div>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 rounded-full border-2 border-transparent border-t-violet-500"
                />
              </div>
              <div className="text-center space-y-1">
                <p className="text-white font-bold">Connecting to room…</p>
                <p className="text-white/30 text-sm">Setting up your secure channel</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Idle — Start Button (fallback if userData not ready) */}
        <AnimatePresence>
          {callState === "idle" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 bg-[#0a0a0a]"
            >
              <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                <Video className="text-white/50" size={36} />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-white text-xl font-black">Ready to join?</h2>
                <p className="text-white/30 text-sm">
                  Your camera and mic will be requested
                </p>
              </div>
              <button
                onClick={startCall}
                className="px-8 py-3.5 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-violet-500/20 flex items-center gap-2"
              >
                <Video size={18} />
                Start Video Call
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Post-Call Panel (Admin Only) */}
        <AnimatePresence>
          {callState === "ended" && showPostCall && !postCallDone && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex items-center justify-center bg-[#0a0a0a] p-6"
            >
              <div className="w-full max-w-md space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
                    <ShieldCheck className="text-white/60" size={28} />
                  </div>
                  <h2 className="text-white text-xl font-black">KYC Verdict</h2>
                  <p className="text-white/40 text-sm">
                    Call ended. Review and submit your decision.
                  </p>
                </div>

                {postCallError && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                    <AlertCircle size={16} />
                    {postCallError}
                  </div>
                )}

                {/* Rejection reason textarea */}
                <div className="space-y-2">
                  <label className="text-white/40 text-xs uppercase tracking-widest font-bold">
                    Rejection Reason
                    <span className="text-red-400 ml-1">(required to reject)</span>
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => {
                      setRejectionReason(e.target.value);
                      if (postCallError) setPostCallError("");
                    }}
                    placeholder="Explain why this KYC is being rejected…"
                    rows={3}
                    className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white/80 text-sm placeholder-white/20 focus:outline-none resize-none transition-colors ${
                      postCallError && !rejectionReason.trim()
                        ? "border-red-500/50 focus:border-red-500/70"
                        : "border-white/10 focus:border-white/20"
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handlePostCall("rejected")}
                    disabled={postCallLoading}
                    className="flex items-center justify-center gap-2 py-3.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 font-bold rounded-xl transition-all text-sm disabled:opacity-50"
                  >
                    {postCallLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <XCircle size={16} />
                    )}
                    Reject
                  </button>
                  <button
                    onClick={() => handlePostCall("approved")}
                    disabled={postCallLoading}
                    className="flex items-center justify-center gap-2 py-3.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 hover:border-green-500/40 text-green-400 font-bold rounded-xl transition-all text-sm disabled:opacity-50"
                  >
                    {postCallLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <ShieldCheck size={16} />
                    )}
                    Approve
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Post-call Done State */}
        <AnimatePresence>
          {postCallDone && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 z-20 flex items-center justify-center bg-[#0a0a0a]"
            >
              <div className="text-center space-y-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${
                    postCallDone === "approved"
                      ? "bg-green-500/10 border border-green-500/20"
                      : "bg-red-500/10 border border-red-500/20"
                  }`}
                >
                  {postCallDone === "approved" ? (
                    <ShieldCheck className="text-green-400" size={36} />
                  ) : (
                    <XCircle className="text-red-400" size={36} />
                  )}
                </motion.div>
                <h2 className="text-white text-2xl font-black capitalize">
                  KYC {postCallDone}!
                </h2>
                <p className="text-white/30 text-sm max-w-xs mx-auto">
                  The partner has been notified. Redirecting you home…
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Partner ended call — no verdict needed */}
        <AnimatePresence>
          {callState === "ended" && !isAdmin && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-20 flex items-center justify-center bg-[#0a0a0a]"
            >
              <div className="text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
                  <VideoOff className="text-white/40" size={32} />
                </div>
                <h2 className="text-white text-xl font-black">Call Ended</h2>
                <p className="text-white/30 text-sm">
                  Your KYC session is complete. The admin will review and notify you shortly.
                </p>
                <button
                  onClick={() => router.push("/")}
                  className="px-6 py-3 bg-white/10 hover:bg-white/15 text-white font-bold rounded-xl transition-all"
                >
                  Back to Dashboard
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Zego Video Container */}
        <div
          ref={containerRef}
          className={`absolute inset-0 w-full h-full transition-opacity duration-500 ${
            callState === "live" ? "opacity-100 z-10" : "opacity-0 pointer-events-none -z-10"
          }`}
        />
      </div>

      {/* Bottom HUD — only when live */}
      <AnimatePresence>
        {callState === "live" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="px-6 py-4 border-t border-white/5 flex items-center justify-between bg-[#0a0a0a]/80 backdrop-blur-md"
          >
            <div className="flex items-center gap-6">
              <div className="space-y-1">
                <p className="text-white/20 text-[10px] font-black uppercase tracking-widest">Room ID</p>
                <p className="text-white/40 text-xs font-mono">{roomid}</p>
              </div>
              <div className="h-8 w-px bg-white/5" />
              <div className="flex items-center gap-2 text-white/30 text-xs">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Secure • Encrypted
              </div>
            </div>

            <button
              onClick={() => {
                if (isAdmin) {
                  setCallState("ended");
                  setShowPostCall(true);
                } else {
                  router.back();
                }
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95"
            >
              <PhoneOff size={14} />
              End Session
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
