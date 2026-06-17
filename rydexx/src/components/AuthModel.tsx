"use client";
import axios from "axios";
import { CircleDashed, Lock, Mail, User, X, Fingerprint } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { signIn } from "next-auth/react";
import { startAuthentication } from "@simplewebauthn/browser";
import toast from "react-hot-toast";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useRouter } from "next/navigation";

type propType = {
  open: boolean;
  onClose: () => void;
  redirectTo?: string;
};
type stepType = "login" | "signup" | "otp";

// Map NextAuth credential error codes → friendly messages
const getCredentialError = (error: string): string => {
  const msg = error.toLowerCase();
  if (msg.includes("suspended") || msg.includes("blocked"))
    return "Your account has been suspended. Contact support.";
  if (msg.includes("google") || msg.includes("use google"))
    return "This account was created with Google. Please use the Google sign-in button.";
  if (msg.includes("not found") || msg.includes("user"))
    return "No account found with this email.";
  if (msg.includes("password") || msg.includes("invalid"))
    return "Incorrect password. Please try again.";
  if (msg.includes("verified") || msg.includes("email"))
    return "Please verify your email before logging in.";
  return "Login failed. Please check your credentials.";
};

// Map raw WebAuthn DOMException names → friendly user-facing messages
const getPasskeyErrorMessage = (err: any): string => {
  const name = err?.name || "";
  const msg = (err?.message || "").toLowerCase();
  if (name === "NotAllowedError" || msg.includes("timed out") || msg.includes("not allowed"))
    return "Verification was cancelled or timed out. Please try again.";
  if (name === "InvalidStateError")
    return "This passkey is already registered on your account.";
  if (name === "NotSupportedError")
    return "Your browser or device doesn't support passkeys. Try Chrome or Safari.";
  if (name === "SecurityError")
    return "Security check failed. Make sure you're on the correct website.";
  if (name === "AbortError")
    return "Verification was cancelled.";
  if (name === "TypeError" || msg.includes("failed to read"))
    return "Something went wrong setting up the passkey. Please try again.";
  if (msg.includes("challenge expired") || msg.includes("missing"))
    return "The passkey session expired. Please try again.";
  if (msg.includes("not registered") || msg.includes("not found"))
    return "No passkey found for this device. Please register one first.";
  return "Passkey login failed. Please try a different sign-in method.";
};

function AuthModel({ open, onClose, redirectTo }: propType) {
  const router = useRouter();

  const [step, setStep] = useState<stepType>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [err, setErr] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resendTimer, setResendTimer] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  useScrollLock(open);
  useFocusTrap(modalRef, open);

  // Clear errors when the user switches steps
  const goToStep = (s: stepType) => {
    setStep(s);
    setErr("");
  };

  // Global Escape Listener
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  useEffect(() => {
    let interval: any;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleSignUp = async () => {
    setErr("");
    if (!name.trim()) return setErr("Please enter your full name.");
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return setErr("Please enter a valid email address.");
    if (password.length < 8) return setErr("Password must be at least 8 characters.");

    setLoading(true);
    try {
      await axios.post("/api/auth/register", { name, email, password });
      setStep("otp");
      setResendTimer(60);
    } catch (error: any) {
      setErr(error.response?.data?.message ?? "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!email) return setErr("Email is required to resend OTP.");
    setResendLoading(true);
    setErr("");
    try {
      await axios.post("/api/auth/resend-otp", { email });
      setResendTimer(60);
    } catch (error: any) {
      setErr(error.response?.data?.message ?? "Failed to resend OTP. Try again.");
    } finally {
      setResendLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    const otpString = otp.join("");
    if (otpString.length < 6) return setErr("Please enter all 6 digits.");
    setLoading(true);
    setErr("");
    try {
      await axios.post("/api/auth/verify-email", { email, otp: otpString });
      setStep("login");
      toast.success("Email verified! You can now log in.", { duration: 3000 });
    } catch (error: any) {
      setErr(error.response?.data?.message ?? "Invalid or expired OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setErr("");
    if (!email.trim()) return setErr("Please enter your email.");
    if (!password) return setErr("Please enter your password.");

    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setErr(getCredentialError(res.error));
      } else if (res?.ok) {
        router.refresh();
        onClose();
        if (redirectTo) router.push(redirectTo);
      }
    } catch {
      setErr("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await signIn("google", { callbackUrl: redirectTo || "/" });
    } catch {
      setGoogleLoading(false);
      toast.error("Google sign-in failed. Please try again.", { duration: 3000 });
    }
  };

  const handlePasskeyLogin = async () => {
    let toastId: string | undefined;
    try {
      toastId = toast.loading("Waiting for biometric...", { duration: Infinity });
      const resp = await fetch("/api/auth/webauthn/login/generate");
      if (!resp.ok) throw new Error("Failed to generate login challenge");
      const options = await resp.json();

      const asseResp = await startAuthentication(options);

      const res = await signIn("passkey", {
        response: JSON.stringify(asseResp),
        redirect: false,
      });

      if (res?.error) {
        const friendly = "No passkey found for this account. Register one first.";
        toast.error(friendly, { id: toastId, duration: 3000 });
        setErr(friendly);
      } else if (res?.ok) {
        toast.success("Logged in!", { id: toastId, duration: 3000 });
        router.refresh();
        onClose();
        if (redirectTo) router.push(redirectTo);
      }
    } catch (err: any) {
      const friendly = getPasskeyErrorMessage(err);
      toast.error(friendly, { id: toastId, duration: 3000 });
      setErr(friendly);
    }
  };

  const handleChangeOtp = (index: number, value: string) => {
    const lastChar = value.slice(-1);
    if (lastChar && !/^[0-9]$/.test(lastChar)) return;
    const newOtp = [...otp];
    newOtp[index] = lastChar;
    setOtp(newOtp);
    if (lastChar && index < otp.length - 1) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
    if (!lastChar && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="z-90 fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            exit={{ opacity: 0, scale: 0.95, y: 40 }}
            className="fixed inset-0 z-100 flex items-center justify-center px-4 pointer-events-none"
          >
            <div
              ref={modalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="auth-modal-title"
              className="relative w-full max-w-md rounded-3xl bg-white border border-black/10 shadow-2xl p-6 sm:p-8 text-black pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                aria-label="Close modal"
                className="absolute right-4 top-4 text-gray-500 hover:text-black transition focus-visible:ring-2 focus-visible:ring-black rounded-full p-1"
                onClick={onClose}
              >
                <X size={20} />
              </button>
              <div className="mb-6 text-center">
                <h1 id="auth-modal-title" className="text-3xl font-extrabold tracking-widest">
                  Rydexx
                </h1>
                <p className="mt-1 text-xs text-gray-500">Premium Vehicle Booking</p>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  className="w-full h-11 rounded-xl border border-black/20 flex items-center justify-center gap-3 text-sm font-semibold hover:bg-black hover:text-white transition disabled:opacity-60 disabled:cursor-not-allowed"
                  onClick={handleGoogleLogin}
                  disabled={googleLoading}
                >
                  {googleLoading ? (
                    <CircleDashed size={18} className="animate-spin" />
                  ) : (
                    <Image src="/google.png" alt="Google Logo" width={20} height={20} />
                  )}
                  {googleLoading ? "Redirecting…" : "Continue With Google"}
                </button>
                <button
                  className="w-full h-11 rounded-xl border border-black/20 flex items-center justify-center gap-3 text-sm font-semibold hover:bg-black hover:text-white transition"
                  onClick={handlePasskeyLogin}
                >
                  <Fingerprint size={18} />
                  Continue With Passkey
                </button>
              </div>
              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-black/20" />
                <div className="text-xs text-gray-500">OR</div>
                <div className="flex-1 h-px bg-black/20" />
              </div>
              <div>
                {step === "login" && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <h2 className="text-xl font-semibold">Welcome Back</h2>
                    <div className="mt-5 space-y-4">
                      <div className="flex items-center gap-3 border border-black/20 rounded-xl px-4 py-3">
                        <Mail size={18} className="text-gray-500" />
                        <input
                          onChange={(e) => { setEmail(e.target.value); setErr(""); }}
                          value={email}
                          className="w-full outline-none bg-transparent text-sm"
                          type="email"
                          placeholder="Email"
                          autoComplete="email"
                        />
                      </div>
                      <div className="flex items-center gap-3 border border-black/20 rounded-xl px-4 py-3">
                        <Lock size={18} className="text-gray-500" />
                        <input
                          onChange={(e) => { setPassword(e.target.value); setErr(""); }}
                          value={password}
                          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                          className="w-full outline-none bg-transparent text-sm"
                          type="password"
                          placeholder="Password"
                          autoComplete="current-password"
                        />
                      </div>
                      {err && (
                        <p className="text-red-500 text-xs leading-relaxed wrap-break-word">{err}</p>
                      )}
                      <button
                        onClick={handleLogin}
                        disabled={loading}
                        className="w-full h-11 rounded-xl bg-black text-white font-semibold hover:bg-gray-900 transition flex justify-center items-center disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {loading ? <CircleDashed size={18} className="animate-spin" /> : "Login"}
                      </button>
                    </div>
                    <p className="mt-6 text-center text-sm text-gray-500">
                      Don't have an account?
                      <span
                        onClick={() => goToStep("signup")}
                        className="text-black font-medium hover:underline cursor-pointer ml-1"
                      >
                        Sign Up
                      </span>
                    </p>
                  </motion.div>
                )}
                {step === "signup" && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <h2 className="text-xl font-semibold">Create Account</h2>
                    <div className="mt-5 space-y-4">
                      <div className="flex items-center gap-3 border border-black/20 rounded-xl px-4 py-3">
                        <User size={18} className="text-gray-500" />
                        <input
                          onChange={(e) => { setName(e.target.value); setErr(""); }}
                          value={name}
                          className="w-full outline-none bg-transparent text-sm"
                          type="text"
                          placeholder="Full Name"
                          autoComplete="name"
                        />
                      </div>
                      <div className="flex items-center gap-3 border border-black/20 rounded-xl px-4 py-3">
                        <Mail size={18} className="text-gray-500" />
                        <input
                          onChange={(e) => { setEmail(e.target.value); setErr(""); }}
                          value={email}
                          className="w-full outline-none bg-transparent text-sm"
                          type="email"
                          placeholder="Email"
                          autoComplete="email"
                        />
                      </div>
                      <div className="flex items-center gap-3 border border-black/20 rounded-xl px-4 py-3">
                        <Lock size={18} className="text-gray-500" />
                        <input
                          onChange={(e) => { setPassword(e.target.value); setErr(""); }}
                          value={password}
                          onKeyDown={(e) => e.key === "Enter" && handleSignUp()}
                          className="w-full outline-none bg-transparent text-sm"
                          type="password"
                          placeholder="Password (min 8 chars)"
                          autoComplete="new-password"
                        />
                      </div>
                      {err && (
                        <p className="text-red-500 text-xs leading-relaxed wrap-break-word">{err}</p>
                      )}
                      <button
                        className="w-full h-11 rounded-xl bg-black text-white font-semibold hover:bg-gray-900 transition flex justify-center items-center disabled:opacity-60 disabled:cursor-not-allowed"
                        disabled={loading}
                        onClick={handleSignUp}
                      >
                        {loading ? (
                          <CircleDashed size={18} color="white" className="animate-spin" />
                        ) : (
                          "Send OTP"
                        )}
                      </button>
                    </div>
                    <p className="mt-6 text-center text-sm text-gray-500">
                      Already have an account?
                      <span
                        onClick={() => goToStep("login")}
                        className="text-black font-medium hover:underline cursor-pointer ml-1"
                      >
                        Log In
                      </span>
                    </p>
                  </motion.div>
                )}
                {step === "otp" && (
                  <motion.div
                    key="otp"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <h2 className="text-xl font-semibold">Verify Email</h2>
                    <p className="text-xs text-gray-500 mt-1">
                      We sent a 6-digit code to <span className="font-medium text-black">{email}</span>
                    </p>
                    <div className="flex mt-6 justify-between gap-2">
                      {otp.map((digit, i) => (
                        <input
                          placeholder=""
                          key={i}
                          id={`otp-${i}`}
                          value={digit}
                          maxLength={1}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleVerifyEmail();
                            if (e.key === "Backspace" && !digit && i > 0) {
                              document.getElementById(`otp-${i - 1}`)?.focus();
                            }
                          }}
                          className="w-10 h-12 sm:w-12 text-center text-lg rounded-xl font-semibold bg-white border border-black/20 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all shadow-sm"
                          onChange={(e) => handleChangeOtp(i, e.target.value)}
                        />
                      ))}
                    </div>
                    {err && (
                      <p className="text-red-500 text-xs mt-2 leading-relaxed wrap-break-word">{err}</p>
                    )}
                    <button
                      className="w-full h-11 rounded-xl bg-black text-white font-semibold hover:bg-gray-900 transition flex justify-center items-center mt-5 disabled:opacity-60 disabled:cursor-not-allowed"
                      onClick={handleVerifyEmail}
                      disabled={loading}
                    >
                      {loading ? (
                        <CircleDashed size={18} color="white" className="animate-spin" />
                      ) : (
                        "Verify"
                      )}
                    </button>
                    <button
                      onClick={handleResendOtp}
                      disabled={resendTimer > 0 || resendLoading}
                      className={`w-full mt-3 h-11 rounded-xl text-sm font-semibold border flex items-center justify-center gap-2 transition-all ${
                        resendTimer > 0 || resendLoading
                          ? "bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed"
                          : "bg-white text-black border-black/20 hover:bg-zinc-50"
                      }`}
                    >
                      {resendLoading ? (
                        <CircleDashed size={16} className="animate-spin" />
                      ) : resendTimer > 0 ? (
                        `Resend OTP in ${resendTimer}s`
                      ) : (
                        "Resend OTP"
                      )}
                    </button>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default AuthModel;
