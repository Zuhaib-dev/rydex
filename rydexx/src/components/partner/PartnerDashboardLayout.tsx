"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { motion } from "framer-motion";
import { LayoutDashboard, PieChart, User, LogOut, Navigation, Menu, Car, ClipboardList, ArrowLeft } from "lucide-react";
import { useState } from "react";

export default function PartnerDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Do not show the layout wrapper on the active-ride map screen
  if (pathname === "/partner/active-ride") {
    return <>{children}</>;
  }

  const navLinks = [
    { name: "Requests", href: "/partner/pending-requests", icon: <LayoutDashboard size={20} /> },
    { name: "Vehicle", href: "/partner/vehicle", icon: <Car size={20} /> },
    { name: "Bookings", href: "/partner/bookings", icon: <ClipboardList size={20} /> },
    { name: "Analytics", href: "/partner/analytics", icon: <PieChart size={20} /> },
    { name: "Profile", href: "/partner/profile", icon: <User size={20} /> },
  ];

  return (
    <div className="min-h-screen bg-[#f4f5f7] flex flex-col">
      {/* ── DESKTOP TOP NAVBAR ── */}
      <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-gray-200 hidden md:block">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-4">
              <Link 
                href="/" 
                className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-gray-500 hover:text-black hover:bg-zinc-200 transition-colors"
                title="Back to Home"
              >
                <ArrowLeft size={16} />
              </Link>
              <Link href="/partner/pending-requests" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white">
                  <Navigation size={18} className="fill-current -rotate-45" />
                </div>
                <span className="font-black text-xl tracking-tight">Rydex</span>
              </Link>
            </div>

            <nav className="flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-4 py-2 text-sm font-semibold rounded-full transition-all ${
                      isActive 
                        ? "bg-zinc-100 text-black" 
                        : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden lg:block">
              <p className="text-sm font-bold text-gray-900">{session?.user?.name}</p>
              <p className="text-xs text-gray-500">{session?.user?.email}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/auth/signin" })}
              className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:text-red-600 hover:bg-red-50 hover:border-red-100 transition-all"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT AREA ── */}
      <main className="flex-1 pb-24 md:pb-0 relative z-10">
        {children}
      </main>

      {/* ── MOBILE BOTTOM NAVBAR ── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-200 md:hidden z-50 px-6 pb-safe pt-2 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
        <div className="flex justify-between items-center h-16">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-all ${
                  isActive ? "text-black" : "text-gray-400"
                }`}
              >
                <div className={`relative p-1.5 ${isActive ? "bg-zinc-100 rounded-xl" : ""}`}>
                  {link.icon}
                  {isActive && (
                    <motion.div
                      layoutId="mobile-nav-indicator"
                      className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-black rounded-full"
                    />
                  )}
                </div>
                <span className="text-[10px] font-bold">{link.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
