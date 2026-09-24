"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { startAuthentication } from "@simplewebauthn/browser";
import toast from "react-hot-toast";
import { CircleDashed, Asterisk, ArrowRight, ArrowUpRight, ArrowLeft } from "lucide-react";

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

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
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
        router.push("/");
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
      await signIn("google", { callbackUrl: "/" });
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
        router.push("/");
      }
    } catch (err: any) {
      const friendly = getPasskeyErrorMessage(err);
      toast.error(friendly, { id: toastId, duration: 3000 });
      setErr(friendly);
    }
  };

  return (
    <div className="facelift-landing min-h-screen flex flex-col md:flex-row">
      <div className="hidden md:flex w-full md:w-1/2 lg:w-3/5 bg-secondary relative flex-col justify-between p-12 border-r border-border overflow-hidden">
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
            One terminal,<br/>every wheel on the road.
          </h1>
          <p className="mt-6 font-mono text-[12px] tracking-widest text-ink/70 max-w-md leading-relaxed uppercase">
            Log in to manage your bookings, fleet, and operator console. Secure connection verified.
          </p>
        </div>
        
        <div className="relative z-10 font-mono text-[10px] tracking-[0.22em] uppercase text-ink/50 flex items-center justify-between">
          <span>Encrypted · TLS 1.3</span>
          <span>SRINAGAR · JK</span>
        </div>
      </div>

      <div className="w-full md:w-1/2 lg:w-2/5 flex flex-col justify-center items-center p-6 sm:p-12 bg-background relative min-h-screen md:min-h-0">
        <Link 
          href="/"
          className="absolute top-6 left-6 md:top-8 md:left-8 group flex items-center justify-center w-10 h-10 rounded-full border border-border bg-background hover:bg-secondary transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
        </Link>
        <div className="w-full max-w-100">
          <div className="flex md:hidden items-baseline gap-1.5 mb-10 mt-8">
            <Link href="/" className="flex items-baseline gap-1.5 hover:opacity-80 transition-opacity">
              <span className="font-serif text-[32px] font-black leading-none tracking-tighter text-ink">Rydex</span>
              <span className="font-mono text-[10px] text-ink/60">™</span>
            </Link>
          </div>

          <div className="mb-8">
            <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-signal mb-1.5 flex items-center">
              <Asterisk className="inline h-3 w-3 mr-1" />
              Re-entry
            </div>
            <h2 className="font-serif text-[40px] leading-[0.95] font-black tracking-tighter">
              Welcome Back
            </h2>
          </div>

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
            <button 
              type="button"
              onClick={handlePasskeyLogin}
              className="group w-full flex items-center justify-between hairline bg-background hover:bg-secondary transition-colors px-4 py-3.5 font-mono text-[11px] tracking-[0.18em] uppercase cursor-pointer"
            >
              <span className="flex items-center gap-3"><PasskeyGlyph /> Continue with Passkey</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>

          <div className="flex items-center gap-3 my-6">
            <span className="flex-1 h-px bg-border" />
            <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-muted-foreground">OR</span>
            <span className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
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

            {err && (
              <div className="font-mono text-[10px] text-red-500 uppercase tracking-wide my-2">
                {err}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group w-full mt-4 brick hover:bg-signal transition-colors px-4 py-4 font-mono text-[11px] tracking-[0.22em] uppercase inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? <CircleDashed className="h-4 w-4 animate-spin" /> : (
                <>
                  Login
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 font-mono text-[11px] text-muted-foreground text-center">
            Don't have an account?{" "}
            <Link
              href="/register"
              className="text-foreground underline underline-offset-4 decoration-signal decoration-2 hover:text-signal uppercase tracking-[0.18em] text-[10px] ml-1 cursor-pointer transition-colors"
            >
              Sign Up
            </Link>
          </p>
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

function PasskeyGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="9" cy="8" r="3.5"/>
      <path d="M9 11.5v9l2-2 2 2v-9"/>
      <path d="M15 6h6M15 9h4"/>
    </svg>
  );
}
