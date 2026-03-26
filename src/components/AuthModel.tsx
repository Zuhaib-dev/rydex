"use client";
import { Lock, Mail, User, X } from "lucide-react";
import { motion } from "motion/react";
import { div } from "motion/react-client";
import Image from "next/image";
import { useState } from "react";
type propType = {
  open: boolean;
  onClose: () => void;
};
type stepType = "login" | "signup" | "otp";
function AuthModel({ open, onClose }: propType) {
  const [step, setStep] = useState<stepType>("login");
  return (
    <>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="z-90 fixed inset-0 bg-black/80 backdrop:blur-md "
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="fixed inset-0 z-100 flex items-center justify-center px-4"
            >
              <div className="relative w-full max-w-md rounded-3xl bg-white border border-black/10 shadow-[0_100px_rgba(0,0,0,0.35 )] p-6 sm:p-8 text-black">
                <div
                  className="absolute right-4 top-4 text-gray-500 hover:text-black transition"
                  onClick={onClose}
                >
                  <X size={20} />
                </div>
                <div className="mb-6 text-center">
                  <h1 className="text-3xl font-extrabold tracking-widest">
                    Rydexx
                  </h1>
                  <p className="mt-1 text-xs text-gray-500">
                    Premium Vehcile Booking
                  </p>
                </div>
                <button className="w-full h-11 rounded-xl border border-black/20 flex items-center justify-center gap-3 text-sm font-semibold hover:bg-black hover:text-white transition">
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
                            className="w-full outline-none bg-transparent text-sm "
                            type="email"
                            placeholder="Email"
                          />
                        </div>
                        <div className="flex items-center gap-3 border border-black/20 rounded-xl px-4 py-3">
                          <Lock size={18} className="text-gray-500" />
                          <input
                            className="w-full outline-none bg-transparent text-sm "
                            type="password"
                            placeholder="Password"
                          />
                        </div>
                        <button className="w-full h-11 rounded-xl bg-black text-white font-semibold hover:bg-gray-900 transition">
                          Login
                        </button>
                      </div>
                      <p className="mt-6 text-center text-sm text-gray-500 ">
                        Don't have an account?
                        <div
                          onClick={() => setStep("signup")}
                          className="text-black font-medium hover:underline"
                        >
                          Sign Up
                        </div>
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
                            className="w-full outline-none bg-transparent text-sm "
                            type="text"
                            placeholder="Full Name"
                          />
                        </div>
                        <div className="flex items-center gap-3 border border-black/20 rounded-xl px-4 py-3">
                          <Mail size={18} className="text-gray-500" />
                          <input
                            className="w-full outline-none bg-transparent text-sm "
                            type="email"
                            placeholder="Email"
                          />
                        </div>
                        <div className="flex items-center gap-3 border border-black/20 rounded-xl px-4 py-3">
                          <Lock size={18} className="text-gray-500" />
                          <input
                            className="w-full outline-none bg-transparent text-sm "
                            type="password"
                            placeholder="Password"
                          />
                        </div>
                        <button className="w-full h-11 rounded-xl bg-black text-white font-semibold hover:bg-gray-900 transition">
                          Login
                        </button>
                      </div>
                      <p className="mt-6 text-center text-sm text-gray-500 ">
                         Alreadt have an account!
                        <div
                          onClick={() => setStep("login")}
                          className="text-black font-medium hover:underline"
                        >
                          Log In
                        </div>
                      </p>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </>
  );
}

export default AuthModel;
