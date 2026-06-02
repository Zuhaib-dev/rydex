"use client";
import axios from "axios";
import { CircleDashed, Lock, Mail, User, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { signIn, useSession } from "next-auth/react";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useRouter } from "next/navigation";
type propType = {
  open: boolean;
  onClose: () => void;
  redirectTo?: string;
};
type stepType = "login" | "signup" | "otp";
function AuthModel({ open, onClose, redirectTo }: propType) {
  const session = useSession();
  const router = useRouter();
  // console.log(session);

  const [step, setStep] = useState<stepType>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resendTimer, setResendTimer] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const { data } = useSession();

  const modalRef = useRef<HTMLDivElement>(null);
  useScrollLock(open);
  useFocusTrap(modalRef, open);

  // Global Escape Listener
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);
  // console.log(data);

  useEffect(() => {
    let interval: any;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleSingUp = async () => {
    setLoading(true);
    setErr("");
    try {
      await axios.post("/api/auth/register", {
        name,
        email,
        password,
      });
      setLoading(false);
      setStep("otp");
      setResendTimer(60); // Start 60 second countdown on signup
    } catch (error: any) {
      setLoading(false);
      setErr(error.response?.data?.message ?? "Something Went Wrong");
    }
  };

  const handleResendOtp = async () => {
    if (!email) {
      setErr("Email is required to resend OTP");
      return;
    }
    setResendLoading(true);
    setErr("");
    try {
      await axios.post("/api/auth/resend-otp", { email });
      setResendLoading(false);
      setResendTimer(60); // Set countdown to 60 seconds
    } catch (error: any) {
      setResendLoading(false);
      setErr(error.response?.data?.message ?? "Failed to resend OTP");
    }
  };

  const handleVerifyEmail = async () => {
    const otpString = otp.join("");
    // console.log("Sending verify:", { email, otp: otpString, otpLength: otpString.length });
    if (otpString.length < 6) {
      setErr("Please enter all 6 digits");
      return;
    }
    setLoading(true);
    setErr("");
    try {
      await axios.post("/api/auth/verify-email", {
        email,
        otp: otpString,
      });
      // console.log(data);
      setLoading(false);
      setStep("login");
    } catch (error: any) {
      setLoading(false);
      setErr(error.response?.data?.message ?? "Something Went Wrong");
    }
  };
  const handleLogin = async () => {
    setLoading(true);
    setErr("");
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);

    if (res?.error) {
      setErr("Invalid email or password"); 
    } else if (res?.ok) {
      router.refresh();
      onClose(); 
      if (redirectTo) {
        router.push(redirectTo);
      }
    }
  };
  const handleGoogleLogin = async () => {
    await signIn("google", { callbackUrl: redirectTo || "/" });
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
            className="z-90 fixed inset-0 bg-black/80 backdrop:blur-md "
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              exit={{ opacity: 0, scale: 0.95, y: 40 }}
              className="fixed inset-0 z-100 flex items-center justify-center px-4"
            >
              <div
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="auth-modal-title"
                className="relative w-full max-w-md rounded-3xl bg-white border border-black/10 shadow-[0_100px_rgba(0,0,0,0.35 )] p-6 sm:p-8 text-black"
              >
                <button
                  aria-label="Close modal"
                  className="absolute right-4 top-4 text-gray-500 hover:text-black transition focus-visible:ring-2 focus-visible:ring-black rounded-full p-1"
                  onClick={onClose}
                >
                  <X size={20} />
                </button>
                <div className="mb-6 text-center">
                  <h1 className="text-3xl font-extrabold tracking-widest">
                    Rydexx
                  </h1>
                  <p className="mt-1 text-xs text-gray-500">
                    Premium Vehicle Booking
                  </p>
                </div>
                <button
                  className="w-full h-11 rounded-xl border border-black/20 flex items-center justify-center gap-3 text-sm font-semibold hover:bg-black hover:text-white transition"
                  onClick={handleGoogleLogin}
                >
                  <Image
                    src={"/google.png"}
                    alt="Google Logo"
                    width={20}
                    height={20}
                  />
                  Continue With Google
                </button>
                <div className="flex items-center gap-4 my-6">
                  <div className="flex-1 h-px bg-black/20" />
                  <div className="text-xs text-gray-500">OR</div>
                  <div className="flex-1 h-px bg-black/20" />
                </div>
                <div>
                  {step == "login" && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <h1 className="text-xl font-semibold">Welcome Back</h1>
                      <div className="mt-5 space-y-4">
                        <div className="flex items-center gap-3 border border-black/20 rounded-xl px-4 py-3">
                          <Mail size={18} className="text-gray-500" />
                          <input
                            onChange={(e) => setEmail(e.target.value)}
                            value={email}
                            className="w-full outline-none bg-transparent text-sm "
                            type="email"
                            placeholder="Email"
                          />
                        </div>
                        <div className="flex items-center gap-3 border border-black/20 rounded-xl px-4 py-3">
                          <Lock size={18} className="text-gray-500" />
                          <input
                            onChange={(e) => setPassword(e.target.value)}
                            value={password}
                            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                            className="w-full outline-none bg-transparent text-sm "
                            type="password"
                            placeholder="Password"
                          />
                        </div>
                        {err && <p className="text-red-500 text-xs">*{err}</p>}
                        <button
                          onClick={handleLogin}
                          className="w-full h-11 rounded-xl bg-black text-white font-semibold hover:bg-gray-900 transition flex justify-center items-center "
                        >
                          {!loading ? (
                            "Login"
                          ) : (
                            <CircleDashed size={18} className="animate-spin" />
                          )}
                        </button>
                      </div>
                      <p className="mt-6 text-center text-sm text-gray-500 ">
                        Don't have an account?
                        <span
                          onClick={() => {
                            setStep("signup");
                            setErr("");
                          }}
                          className="text-black font-medium hover:underline cursor-pointer ml-1"
                        >
                          Sign Up
                        </span>
                      </p>
                    </motion.div>
                  )}
                  {step == "signup" && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <h1 className="text-xl font-semibold">Create Account</h1>
                      <div className="mt-5 space-y-4">
                        <div className="flex items-center gap-3 border border-black/20 rounded-xl px-4 py-3">
                          <User size={18} className="text-gray-500" />
                          <input
                            onChange={(e) => setName(e.target.value)}
                            value={name}
                            className="w-full outline-none bg-transparent text-sm "
                            type="text"
                            placeholder="Full Name"
                          />
                        </div>
                        <div className="flex items-center gap-3 border border-black/20 rounded-xl px-4 py-3">
                          <Mail size={18} className="text-gray-500" />
                          <input
                            onChange={(e) => setEmail(e.target.value)}
                            value={email}
                            className="w-full outline-none bg-transparent text-sm "
                            type="email"
                            placeholder="Email"
                          />
                        </div>
                        <div className="flex items-center gap-3 border border-black/20 rounded-xl px-4 py-3">
                          <Lock size={18} className="text-gray-500" />
                          <input
                            onChange={(e) => setPassword(e.target.value)}
                            value={password}
                            onKeyDown={(e) => e.key === "Enter" && handleSingUp()}
                            className="w-full outline-none bg-transparent text-sm "
                            type="password"
                            placeholder="Password"
                          />
                        </div>
                        {err && <p className="text-red-500 text-xs">*{err}</p>}
                        <button
                          className="w-full h-11 rounded-xl bg-black text-white font-semibold hover:bg-gray-900 transition flex justify-center items-center  "
                          disabled={loading}
                          onClick={handleSingUp}
                        >
                          {!loading ? (
                            "Send OTP"
                          ) : (
                            <CircleDashed
                              size={18}
                              color="white"
                              className="animate-spin"
                            />
                          )}
                        </button>
                      </div>
                      <p className="mt-6 text-center text-sm text-gray-500 ">
                        Already have an account?
                        <span
                          onClick={() => {
                            setStep("login");
                            setErr("");
                          }}
                          className="text-black font-medium hover:underline cursor-pointer ml-1"
                        >
                          Log In
                        </span>
                      </p>
                    </motion.div>
                  )}
                  {step == "otp" && (
                    <motion.div
                      key="otp"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className=""
                    >
                      <h2 className="text-xl font-semibold">Verify Email</h2>
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
                      {err && <p className="text-red-500 text-xs mt-2">*{err}</p>}
                      <button
                        className="w-full h-11 rounded-xl bg-black text-white font-semibold hover:bg-gray-900 transition flex justify-center items-center mt-5 "
                        onClick={handleVerifyEmail}
                      >
                        {!loading ? (
                          "Verify"
                        ) : (
                          <CircleDashed
                            size={18}
                            color="white"
                            className="animate-spin"
                          />
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
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default AuthModel;
