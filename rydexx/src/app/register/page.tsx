"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { startAuthentication } from "@simplewebauthn/browser";
import toast from "react-hot-toast";
import axios from "axios";
import { CircleDashed, Asterisk, ArrowRight, ArrowUpRight, ArrowLeft } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  
  const [step, setStep] = useState<"signup" | "otp">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [err, setErr] = useState("");
  
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resendTimer, setResendTimer] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    let interval: any;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
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
      toast.success("Email verified! You can now log in.", { duration: 3000 });
      router.push("/login");
    } catch (error: any) {
      setErr(error.response?.data?.message ?? "Invalid or expired OTP.");
    } finally {
      setLoading(false);
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

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await signIn("google", { callbackUrl: "/" });
    } catch {
      setGoogleLoading(false);
      toast.error("Google sign-in failed. Please try again.", { duration: 3000 });
    }
  };

  return (
    <div className="facelift-landing min-h-screen flex flex-col md:flex-row">
      {/* Left side - Branding / Image */}
      <div className="hidden md:flex w-full md:w-1/2 lg:w-3/5 bg-secondary relative flex-col justify-between p-12 border-r border-border overflow-hidden">
        {/* Background Grid */}
        <div
          className="absolute inset-0 opacity-40 mix-blend-multiply"
          style={{
            backgroundImage:
              "linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative z-10 flex items-baseline gap-1.5 mb-10">
          <Link href="/" className="flex items-baseline gap-1.5 hover:opacity-80 transition-opacity">
            <span className="font-serif text-[40px] font-black leading-none tracking-tighter text-ink">Rydex</span>
            <span className="font-mono text-[12px] text-ink/60">™</span>
          </Link>
        </div>
        
        <div className="relative z-10 max-w-lg mb-10">
          <div className="font-mono text-[11px] tracking-[0.25em] uppercase text-signal mb-5 flex items-center gap-2">
            <Asterisk className="h-3 w-3" /> System Access
          </div>
          <h1 className="font-serif text-[48px] lg:text-[64px] font-black leading-[0.9] tracking-tighter text-ink">
            Join the Fleet<br/>and take control.
          </h1>
          <p className="mt-6 font-mono text-[12px] tracking-[0.1em] text-ink/70 max-w-md leading-relaxed uppercase">
            Create an account to book rides instantly. One terminal, every wheel on the road.
          </p>
        </div>
        
        <div className="relative z-10 font-mono text-[10px] tracking-[0.22em] uppercase text-ink/50 flex items-center justify-between">
          <span>Encrypted · TLS 1.3</span>
          <span>SRINAGAR · JK</span>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full md:w-1/2 lg:w-2/5 flex flex-col justify-center items-center p-6 sm:p-12 bg-background relative min-h-screen md:min-h-0">
        <Link 
          href="/"
          className="absolute top-6 left-6 md:top-8 md:left-8 group flex items-center justify-center w-10 h-10 rounded-full border border-border bg-background hover:bg-secondary transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
        </Link>
        <div className="w-full max-w-[400px]">
          {/* Mobile brand */}
          <div className="flex md:hidden items-baseline gap-1.5 mb-10 mt-8">
            <Link href="/" className="flex items-baseline gap-1.5 hover:opacity-80 transition-opacity">
              <span className="font-serif text-[32px] font-black leading-none tracking-tighter text-ink">Rydex</span>
              <span className="font-mono text-[10px] text-ink/60">™</span>
            </Link>
          </div>

          <div className="mb-8">
            <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-signal mb-1.5 flex items-center">
              <Asterisk className="inline h-3 w-3 mr-1" />
              {step === "signup" ? "First dispatch" : "Verification"}
            </div>
            <h2 className="font-serif text-[40px] leading-[0.95] font-black tracking-tighter">
              {step === "signup" ? "Create Account" : "Verify Comms"}
            </h2>
          </div>

          {step === "signup" && (
            <>
              <div className="space-y-3 mb-6">
                <button 
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={googleLoading}
                  className="group w-full flex items-center justify-between hairline bg-background hover:bg-secondary transition-colors px-4 py-3.5 font-mono text-[11px] tracking-[0.18em] uppercase cursor-pointer disabled:opacity-50"
                >
                  <span className="flex items-center gap-3">
                    {googleLoading ? <CircleDashed className="h-3.5 w-3.5 animate-spin" /> : <GoogleGlyph />} 
                    Continue with Google
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>

              <div className="flex items-center gap-3 my-6">
                <span className="flex-1 h-px bg-border" />
                <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-muted-foreground">OR</span>
                <span className="flex-1 h-px bg-border" />
              </div>
            </>
          )}

          <form onSubmit={step === "signup" ? handleSignUp : (e) => e.preventDefault()} className="space-y-4">
            {step === "signup" && (
              <>
                <label className="block">
                  <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground block mb-2">Full Name</span>
                  <input
                    type="text"
                    placeholder="Your Name"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setErr(""); }}
                    className="w-full hairline bg-background px-4 py-3.5 font-mono text-[12px] tracking-wide focus:outline-none focus:border-signal focus:ring-1 focus:ring-signal transition-colors placeholder:text-muted-foreground/60 text-ink"
                  />
                </label>
                <label className="block">
                  <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground block mb-2">Email</span>
                  <input
                    type="email"
                    placeholder="you@dispatch.in"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setErr(""); }}
                    className="w-full hairline bg-background px-4 py-3.5 font-mono text-[12px] tracking-wide focus:outline-none focus:border-signal focus:ring-1 focus:ring-signal transition-colors placeholder:text-muted-foreground/60 text-ink"
                  />
                </label>
                <label className="block">
                  <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground block mb-2">Password</span>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setErr(""); }}
                    className="w-full hairline bg-background px-4 py-3.5 font-mono text-[12px] tracking-wide focus:outline-none focus:border-signal focus:ring-1 focus:ring-signal transition-colors placeholder:text-muted-foreground/60 text-ink"
                  />
                </label>
              </>
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
                      className="w-10 sm:w-12 h-14 text-center text-lg rounded-none bg-background hairline focus:outline-none focus:border-signal focus:ring-1 focus:ring-signal transition-all text-ink"
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

            {step === "signup" ? (
              <button
                type="submit"
                disabled={loading}
                className="group w-full mt-4 brick hover:bg-signal transition-colors px-4 py-4 font-mono text-[11px] tracking-[0.22em] uppercase inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? <CircleDashed className="h-4 w-4 animate-spin" /> : (
                  <>
                    Create Account
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </>
                )}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleVerifyEmail}
                  disabled={loading}
                  className="group w-full mt-2 brick hover:bg-signal transition-colors px-4 py-4 font-mono text-[11px] tracking-[0.22em] uppercase inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? <CircleDashed className="h-4 w-4 animate-spin" /> : "Verify Code"}
                </button>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendTimer > 0 || resendLoading}
                  className="w-full mt-3 hairline bg-background hover:bg-secondary transition-colors px-4 py-4 font-mono text-[11px] tracking-[0.22em] uppercase flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {resendLoading ? <CircleDashed className="h-4 w-4 animate-spin" /> : 
                    resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend Code"
                  }
                </button>
              </>
            )}
          </form>

          {step === "signup" && (
            <p className="mt-8 font-mono text-[11px] text-muted-foreground text-center">
              Already on the road?{" "}
              <Link
                href="/login"
                className="text-foreground underline underline-offset-4 decoration-signal decoration-2 hover:text-signal uppercase tracking-[0.18em] text-[10px] ml-1 cursor-pointer transition-colors"
              >
                Log In
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.4 14.6 2.5 12 2.5 6.8 2.5 2.6 6.7 2.6 12S6.8 21.5 12 21.5c6.9 0 9.5-4.8 9.5-7.3 0-.5 0-.9-.1-1.3H12z"/>
    </svg>
  );
}
