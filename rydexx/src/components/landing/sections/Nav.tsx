"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  ArrowRight,
  Bike,
  Car,
  Truck,
  Package,
  CarTaxiFront,
  MapPin,
  Plus,
  Asterisk,
  Check,
  Stamp,
  User,
  Clock,
  Wallet,
  Ticket,
  Briefcase,
  ShieldCheck,
  Fingerprint,
  LogOut,
  Star,
  Bell,
  LayoutDashboard,
  RefreshCcw,
  Activity
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

import AuthModel from "../../AuthModel";
import InstallModal from "../../InstallModal";
import { getSocket } from "@/lib/socket";
import { useSWRConfig } from "swr";

/* ───────────────────────── NAV ───────────────────────── */
function Nav({ onAuthRequired }: { onAuthRequired: (redirectUrl?: string) => void }) {
  const { data: session, status } = useSession();
  const isLoadingSession = status === "loading";
  const [mockLoggedIn, setMockLoggedIn] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installOpen, setInstallOpen] = useState(false);
  const [isSocketLive, setIsSocketLive] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { mutate } = useSWRConfig();

  useEffect(() => {
    if (session?.user) {
      setUser(session.user);
    } else {
      setUser(null);
    }
  }, [session]);

  useEffect(() => {
    if (user?.role !== "admin") return;
    const socket = getSocket();
    
    const onConnect = () => setIsSocketLive(true);
    const onDisconnect = () => setIsSocketLive(false);

    if (socket.connected) {
      setIsSocketLive(true);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [user?.role]);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = () => {
    setInstallOpen(true);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await mutate(() => true, undefined, { revalidate: true });
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const isLoggedIn = mockLoggedIn || !!user;

  return (
    <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-md border-b border-border">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 grid grid-cols-[auto_1fr_auto] items-center gap-6 py-3">
        <Link href="/" className="flex items-baseline gap-1.5">
          <span className="font-serif text-[28px] font-black leading-none tracking-tighter">Rydex</span>
          <span className="font-mono text-[10px] text-muted-foreground">™</span>
        </Link>

        {user?.role !== "admin" && (
          <nav className="hidden md:flex items-center justify-center gap-8 font-mono text-[11px] tracking-[0.18em] uppercase">
            {[
              { label: "Bookings", href: "/bookings" },
              { label: "Fleet", href: "/fleet" },
              { label: "FAQ", href: "/faq" },
              { label: "Contact", href: "/contact" }
            ].map((link) => (
              <a key={link.label} href={link.href} className="relative group">
                {link.label}
                <span className="absolute -bottom-1 left-0 right-0 h-px bg-foreground scale-x-0 group-hover:scale-x-100 origin-left transition-transform" />
              </a>
            ))}
          </nav>
        )}

        <div className="flex items-center justify-end gap-2 relative min-h-[40px] min-w-[80px]">
          {isLoadingSession ? (
            <div className="h-10 w-10 sm:w-28 bg-foreground/10 animate-pulse rounded-full sm:rounded-none" />
          ) : !isLoggedIn ? (
            <>
              <button 
                onClick={(e) => {
                  if (e.altKey) setMockLoggedIn(true);
                  else onAuthRequired("/");
                }} 
                className="font-mono text-[11px] tracking-[0.18em] uppercase hover:text-signal transition-colors"
                title="Alt-Click to mock login"
              >
                Log in →
              </button>
              <button
                onClick={handleInstallClick}
                className="group inline-flex items-center gap-2 brick px-4 py-2 font-mono text-[11px] tracking-[0.18em] uppercase hover:bg-signal transition-colors"
              >
                <span>Get the App</span>
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-4">
              {user?.role === "admin" && (
                <div className="hidden sm:flex items-center gap-4 mr-2">
                  <button 
                    onClick={handleRefresh} 
                    className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground hover:text-signal transition-colors"
                  >
                    <RefreshCcw size={12} className={isRefreshing ? "animate-spin text-signal" : ""} />
                    <span className="hidden lg:inline">{isRefreshing ? "Refreshing" : "Refresh"}</span>
                  </button>
                  <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.18em] uppercase">
                    <span className="relative flex h-2 w-2">
                      {isSocketLive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-signal opacity-75"></span>}
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${isSocketLive ? "bg-signal" : "bg-muted-foreground/30"}`}></span>
                    </span>
                    <span className={isSocketLive ? "text-signal" : "text-muted-foreground"}>LIVE</span>
                  </div>
                </div>
              )}
              <div className="relative">
                <button 
                  onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center justify-center h-10 w-10 rounded-full border border-border bg-bone text-ink font-serif font-bold hover:bg-signal hover:text-bone hover:border-signal transition-colors uppercase overflow-hidden"
              >
                {user.image && !imgError && user.image.trim() !== "" ? (
                  <img 
                    src={user.image} 
                    alt={user.name || "User"} 
                    className="h-full w-full object-cover"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  user.name ? user.name.charAt(0).toUpperCase() : "Y"
                )}
              </button>
              
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    className="absolute right-0 top-full mt-3 w-[280px] bg-card border border-border shadow-[8px_8px_0_0_var(--color-ink)] z-40 overflow-hidden"
                  >
                    {/* Header */}
                    <div className="p-5 border-b border-border bg-secondary/30">
                      <div className="font-serif text-xl font-bold">{user.name || "User"}</div>
                      <div className="font-mono text-[10px] text-muted-foreground mt-1">{user.email || ""}</div>
                      
                      <div className="mt-4 flex items-center justify-between font-mono text-[9px] tracking-[0.2em] uppercase">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Star className="h-3 w-3" /> No ratings yet
                        </div>
                        <div className="text-signal font-bold">
                          ROLE: {user.role || "USER"}
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="p-2 flex flex-col gap-0.5 font-mono text-[11px] tracking-[0.15em] uppercase">
                      {user.role === "admin" ? (
                        <>
                          <MenuItem icon={LayoutDashboard} label="Control Tower" href="/admin/tower" />
                        </>
                      ) : user.role === "partner" ? (
                        <>
                          <MenuItem icon={User} label="Partner Profile" href="/partner/profile" />
                          <MenuItem icon={Briefcase} label="Operator Console" href="/partner" />
                          <MenuItem icon={Truck} label="My Vehicle" href="/partner/vehicle" />
                          <MenuItem icon={Clock} label="My Bookings" href="/partner/bookings" />
                          <MenuItem icon={Wallet} label="Settlements" href="/partner/settlements" />
                        </>
                      ) : (
                        <>
                          <MenuItem icon={User} label="Profile" href="/profile" />
                          <MenuItem icon={Bell} label="Notifications" href="/notifications" />
                          <MenuItem icon={Clock} label="My Bookings" href="/bookings" />
                          <MenuItem icon={Wallet} label="My Wallet" href="/wallet" />
                          <MenuItem icon={Ticket} label="My Passes" href="/pass" />
                          
                          <div className="my-2 h-px bg-border w-full" />
                          <MenuItem icon={Briefcase} label="Become a Partner" href="/partner/onboarding/vehicle" />
                        </>
                      )}
                      
                      <div className="my-2 h-px bg-border w-full" />
                      
                      <MenuItem icon={ShieldCheck} label="Security Settings" href="/settings/security" />
                      <MenuItem icon={Fingerprint} label="Register Passkey" href="/settings/security?passkey=new" />
                      
                      <div className="my-2 h-px bg-border w-full" />
                      
                      <button 
                        onClick={() => {
                          if (session) signOut();
                          setMockLoggedIn(false);
                          setMenuOpen(false);
                        }}
                        className="flex items-center gap-3 px-3 py-2.5 text-left text-signal hover:bg-signal/10 transition-colors w-full"
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </div>
          </div>
          )}
        </div>
      </div>
      <InstallModal 
        open={installOpen} 
        onClose={() => setInstallOpen(false)} 
        deferredPrompt={deferredPrompt} 
      />
    </header>
  );
}

function MenuItem({ icon: Icon, label, href }: { icon: LucideIcon, label: string, href: string }) {
  return (
    <a href={href} className="flex items-center gap-3 px-3 py-2.5 hover:bg-secondary transition-colors group">
      <Icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      <span className="text-foreground/80 group-hover:text-foreground transition-colors">{label}</span>
    </a>
  );
}

export default Nav;
