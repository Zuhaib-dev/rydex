"use client";
import axios from "axios";
import { CircleDashed, Asterisk, ArrowRight, ArrowUpRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
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

export default function AuthModel({ open, onClose, redirectTo }: propType) {
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

  const goToStep = (s: stepType) => {
    setStep(s);
    setErr("");
  };

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
        <motion.div
          key="auth-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            key="auth-modal-content"
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[440px] bg-background hairline shadow-[12px_12px_0_0_var(--color-ink)]"
          >
            {/* Top ticker */}
            <div className="brick font-mono text-[10px] tracking-[0.22em] py-1.5 px-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="text-signal animate-blink">●</span> AUTH TERMINAL / 24H
              </span>
              <button onClick={onClose} className="hover:text-signal text-lg leading-none cursor-pointer" aria-label="Close">×</button>
            </div>

            <div className="p-7">
              {/* Brand */}
              <div className="flex items-baseline justify-between mb-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-serif text-[34px] font-black leading-none tracking-tighter">Rydex</span>
                  <span className="font-mono text-[10px] text-muted-foreground">™</span>
                </div>
                <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">N° 001</span>
              </div>
              <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground hairline-b pb-3 mb-5">
                Premium Vehicle Booking
              </p>

              {/* Headline */}
              <div className="mb-5">
                <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-signal mb-1.5 flex items-center">
                  <Asterisk className="inline h-3 w-3 mr-1" />
                  {step === "login" ? "Re-entry" : step === "signup" ? "First dispatch" : "Verification"}
                </div>
                <h2 className="font-serif text-[40px] leading-[0.95] font-black tracking-tighter">
                  {step === "login" ? "Welcome Back" : step === "signup" ? "Join the Fleet" : "Verify Comms"}
                </h2>
              </div>

              {step !== "otp" && (
                <>
                  {/* Providers */}
                  <div className="space-y-2.5 mb-5">
                    <button 
                      onClick={handleGoogleLogin}
                      disabled={googleLoading}
                      className="group w-full flex items-center justify-between hairline bg-background hover:bg-secondary transition-colors px-4 py-3 font-mono text-[11px] tracking-[0.18em] uppercase cursor-pointer disabled:opacity-50"
                    >
                      <span className="flex items-center gap-3">
                        {googleLoading ? <CircleDashed className="h-3.5 w-3.5 animate-spin" /> : <GoogleGlyph />} 
                        Continue with Google
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </button>
                    <button 
                      onClick={handlePasskeyLogin}
                      className="group w-full flex items-center justify-between hairline bg-background hover:bg-secondary transition-colors px-4 py-3 font-mono text-[11px] tracking-[0.18em] uppercase cursor-pointer"
                    >
                      <span className="flex items-center gap-3"><PasskeyGlyph /> Continue with Passkey</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </div>

                  {/* OR */}
                  <div className="flex items-center gap-3 my-5">
                    <span className="flex-1 h-px bg-border" />
                    <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-muted-foreground">OR</span>
                    <span className="flex-1 h-px bg-border" />
                  </div>
                </>
              )}

              {/* Form */}
              <form onSubmit={(e) => { e.preventDefault(); step === "login" ? handleLogin() : handleSignUp(); }} className="space-y-3">
                {step === "signup" && (
                  <label className="block">
                    <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground block mb-1.5">Full Name</span>
                    <input
                      type="text"
                      placeholder="Your Name"
                      value={name}
                      onChange={(e) => { setName(e.target.value); setErr(""); }}
                      className="w-full hairline bg-background px-3 py-2.5 font-mono text-[12px] tracking-wide focus:outline-none focus:border-signal focus:ring-1 focus:ring-signal transition-colors placeholder:text-muted-foreground/60"
                    />
                  </label>
                )}
                {step !== "otp" && (
                  <label className="block">
                    <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground block mb-1.5">Email</span>
                    <input
                      type="email"
                      placeholder="you@dispatch.in"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setErr(""); }}
                      className="w-full hairline bg-background px-3 py-2.5 font-mono text-[12px] tracking-wide focus:outline-none focus:border-signal focus:ring-1 focus:ring-signal transition-colors placeholder:text-muted-foreground/60"
                    />
                  </label>
                )}
                {step !== "otp" && (
                  <label className="block">
                    <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground block mb-1.5">Password</span>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setErr(""); }}
                      className="w-full hairline bg-background px-3 py-2.5 font-mono text-[12px] tracking-wide focus:outline-none focus:border-signal focus:ring-1 focus:ring-signal transition-colors placeholder:text-muted-foreground/60"
                    />
                  </label>
                )}

                {step === "otp" && (
                  <div className="space-y-4">
                    <p className="font-mono text-[11px] text-muted-foreground leading-relaxed">
                      We sent a 6-digit code to <br/><span className="text-foreground">{email}</span>
                    </p>
                    <div className="flex justify-between gap-2 my-5">
                      {otp.map((digit, i) => (
                        <input
                          key={i}
                          id={`otp-${i}`}
                          value={digit}
                          maxLength={1}
                          onChange={(e) => handleChangeOtp(i, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleVerifyEmail();
                            if (e.key === "Backspace" && !digit && i > 0) {
                              document.getElementById(`otp-${i - 1}`)?.focus();
                            }
                          }}
                          className="w-10 h-12 text-center text-lg rounded-none bg-background hairline focus:outline-none focus:border-signal focus:ring-1 focus:ring-signal transition-all"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {err && (
                  <div className="font-mono text-[10px] text-red-500 uppercase tracking-wide my-2">
                    {err}
                  </div>
                )}

                {step !== "otp" ? (
                  <button
                    type="submit"
                    disabled={loading}
                    className="group w-full mt-2 brick hover:bg-signal transition-colors px-4 py-3 font-mono text-[11px] tracking-[0.22em] uppercase inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? <CircleDashed className="h-3.5 w-3.5 animate-spin" /> : (
                      <>
                        {step === "login" ? "Login" : "Create Account"}
                        <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </>
                    )}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleVerifyEmail}
                      disabled={loading}
                      className="group w-full mt-2 brick hover:bg-signal transition-colors px-4 py-3 font-mono text-[11px] tracking-[0.22em] uppercase inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {loading ? <CircleDashed className="h-3.5 w-3.5 animate-spin" /> : "Verify Code"}
                    </button>
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resendTimer > 0 || resendLoading}
                      className="w-full mt-3 hairline bg-background hover:bg-secondary transition-colors px-4 py-3 font-mono text-[11px] tracking-[0.22em] uppercase flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {resendLoading ? <CircleDashed className="h-3.5 w-3.5 animate-spin" /> : 
                        resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend Code"
                      }
                    </button>
                  </>
                )}
              </form>

              {/* Toggle */}
              {step !== "otp" && (
                <p className="mt-5 font-mono text-[11px] text-muted-foreground text-center">
                  {step === "login" ? "Don't have an account?" : "Already on the road?"}{" "}
                  <button
                    onClick={() => goToStep(step === "login" ? "signup" : "login")}
                    className="text-foreground underline underline-offset-4 decoration-signal decoration-2 hover:text-signal uppercase tracking-[0.18em] text-[10px] ml-1 cursor-pointer"
                  >
                    {step === "login" ? "Sign Up" : "Log In"}
                  </button>
                </p>
              )}
            </div>

            {/* Footer ticker */}
            <div className="hairline-t font-mono text-[9px] tracking-[0.22em] uppercase text-muted-foreground flex items-center justify-between px-4 py-2">
              <span>Encrypted · TLS 1.3</span>
              <span>FILED · MUMBAI</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function GoogleGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.4 14.6 2.5 12 2.5 6.8 2.5 2.6 6.7 2.6 12S6.8 21.5 12 21.5c6.9 0 9.5-4.8 9.5-7.3 0-.5 0-.9-.1-1.3H12z"/>
    </svg>
  );
}

function PasskeyGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="9" cy="8" r="3.5"/>
      <path d="M9 11.5v9l2-2 2 2v-9"/>
      <path d="M15 6h6M15 9h4"/>
    </svg>
  );
}
