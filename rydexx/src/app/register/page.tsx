import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Mail, Lock, User, Phone } from "lucide-react";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Join Rydex today. Create an account to easily book bikes, cars, and trucks. Fast, reliable, and affordable rides.",
  openGraph: {
    title: "Create Account | Rydex",
    description: "Join Rydex today. Create an account to easily book bikes, cars, and trucks. Fast, reliable, and affordable rides.",
    url: "https://rydexx.netlify.app/register",
    siteName: "Rydex",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Create Account | Rydex",
    description: "Join Rydex today. Create an account to easily book bikes, cars, and trucks. Fast, reliable, and affordable rides.",
  },
  alternates: {
    canonical: "https://rydexx.netlify.app/register",
  },
};

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4 selection:bg-black selection:text-white relative overflow-hidden">
      {/* Decorative background blur */}
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-black/3 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-black/3 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-lg bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100 p-8 sm:p-10 relative z-10 my-8">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6 transition-transform hover:scale-105 active:scale-95">
            <div className="w-12 h-12 bg-black text-white rounded-xl flex items-center justify-center mx-auto shadow-lg shadow-black/10">
              <span className="font-display font-bold text-xl tracking-tighter">R</span>
            </div>
          </Link>
          <h1 className="text-3xl font-display font-bold text-neutral-900 tracking-tight mb-2">Create an account</h1>
          <p className="text-neutral-500 text-sm font-medium">Join Rydex and start booking instantly</p>
        </div>

        <form className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label htmlFor="firstName" className="text-xs font-semibold text-neutral-900 uppercase tracking-wider ml-1">
                First Name
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-400 group-focus-within:text-black transition-colors">
                  <User size={18} />
                </div>
                <input
                  id="firstName"
                  type="text"
                  placeholder="John"
                  className="w-full pl-11 pr-4 py-3.5 bg-neutral-50 border border-transparent rounded-xl text-sm transition-all focus:bg-white focus:border-black focus:ring-4 focus:ring-black/5 outline-none placeholder:text-neutral-400 text-neutral-900 font-medium"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="lastName" className="text-xs font-semibold text-neutral-900 uppercase tracking-wider ml-1">
                Last Name
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-400 group-focus-within:text-black transition-colors">
                  <User size={18} />
                </div>
                <input
                  id="lastName"
                  type="text"
                  placeholder="Doe"
                  className="w-full pl-11 pr-4 py-3.5 bg-neutral-50 border border-transparent rounded-xl text-sm transition-all focus:bg-white focus:border-black focus:ring-4 focus:ring-black/5 outline-none placeholder:text-neutral-400 text-neutral-900 font-medium"
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-xs font-semibold text-neutral-900 uppercase tracking-wider ml-1">
              Email Address
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-400 group-focus-within:text-black transition-colors">
                <Mail size={18} />
              </div>
              <input
                id="email"
                type="email"
                placeholder="hello@example.com"
                className="w-full pl-11 pr-4 py-3.5 bg-neutral-50 border border-transparent rounded-xl text-sm transition-all focus:bg-white focus:border-black focus:ring-4 focus:ring-black/5 outline-none placeholder:text-neutral-400 text-neutral-900 font-medium"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="phone" className="text-xs font-semibold text-neutral-900 uppercase tracking-wider ml-1">
              Phone Number
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-400 group-focus-within:text-black transition-colors">
                <Phone size={18} />
              </div>
              <input
                id="phone"
                type="tel"
                placeholder="+1 (555) 000-0000"
                className="w-full pl-11 pr-4 py-3.5 bg-neutral-50 border border-transparent rounded-xl text-sm transition-all focus:bg-white focus:border-black focus:ring-4 focus:ring-black/5 outline-none placeholder:text-neutral-400 text-neutral-900 font-medium"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-xs font-semibold text-neutral-900 uppercase tracking-wider ml-1">
              Password
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-400 group-focus-within:text-black transition-colors">
                <Lock size={18} />
              </div>
              <input
                id="password"
                type="password"
                placeholder="Create a strong password"
                className="w-full pl-11 pr-4 py-3.5 bg-neutral-50 border border-transparent rounded-xl text-sm transition-all focus:bg-white focus:border-black focus:ring-4 focus:ring-black/5 outline-none placeholder:text-neutral-400 text-neutral-900 font-medium"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full group relative flex items-center justify-center gap-2 bg-black text-white py-3.5 rounded-xl text-sm font-semibold hover:bg-neutral-900 transition-all active:scale-[0.98] shadow-lg shadow-black/10 overflow-hidden mt-6"
          >
            <span className="relative z-10 flex items-center gap-2">
              Create Account
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </span>
          </button>
        </form>

        <div className="my-8 flex items-center gap-4">
          <div className="h-px flex-1 bg-neutral-100" />
          <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Or continue with</span>
          <div className="h-px flex-1 bg-neutral-100" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button className="flex items-center justify-center gap-2 py-3 border border-neutral-200 rounded-xl hover:bg-neutral-50 hover:border-neutral-300 transition-all text-sm font-medium text-neutral-700 active:scale-[0.98]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Google
          </button>
          <button className="flex items-center justify-center gap-2 py-3 border border-neutral-200 rounded-xl hover:bg-neutral-50 hover:border-neutral-300 transition-all text-sm font-medium text-neutral-700 active:scale-[0.98]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M16.365 7.188c1.144-1.385 1.914-3.125 1.706-4.888-1.52.062-3.344 1.01-4.512 2.39-1.042 1.222-1.927 3.003-1.685 4.726 1.698.13 3.356-.842 4.49-2.228zm3.59 13.918c-1.36 1.986-2.76 3.963-4.945 4.004-2.146.04-2.852-1.264-5.296-1.264-2.456 0-3.232 1.223-5.296 1.305-2.146.082-3.743-2.15-5.114-4.13C-3.486 11.238 2.008 3.593 7.24 3.675c2.103.04 4.015 1.488 5.296 1.488 1.282 0 3.585-1.748 6.14-1.488 1.05.044 4.006.42 5.922 3.226-4.757 2.802-3.996 9.475.357 11.127-.723 1.83-1.696 3.32-2.999 5.228z"/></svg>
            Apple
          </button>
        </div>

        <p className="mt-8 text-center text-sm font-medium text-neutral-500">
          Already have an account?{" "}
          <Link href="/login" className="text-black hover:underline underline-offset-4 font-semibold transition-all">
            Sign in
          </Link>
        </p>
        
        <p className="mt-4 text-center text-xs text-neutral-400 max-w-sm mx-auto">
          By continuing, you agree to Rydex's{" "}
          <Link href="/terms" className="underline hover:text-neutral-700">Terms of Service</Link>
          {" "}and{" "}
          <Link href="/privacy" className="underline hover:text-neutral-700">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
