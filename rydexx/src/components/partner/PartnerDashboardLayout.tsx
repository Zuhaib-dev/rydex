"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import useSWR from "swr";
import { usePathname } from "next/navigation";
import Nav from "@/components/landing/sections/Nav";
import Ticker from "@/components/landing/sections/Ticker";
import Foot from "@/components/landing/sections/Foot";
import {
  LayoutGrid,
  Inbox,
  CalendarRange,
  Truck,
  LineChart,
  Wallet,
  Map as MapIcon,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then(res => res.json());

const LINKS = [
  { href: "/partner", label: "Overview", code: "00", icon: LayoutGrid, exact: true },
  { href: "/partner/pending-requests", label: "Pending Requests", code: "01", icon: Inbox },
  { href: "/partner/bookings", label: "My Bookings", code: "02", icon: CalendarRange },
  { href: "/partner/vehicle", label: "My Vehicle", code: "03", icon: Truck },
  { href: "/partner/analytics", label: "Analytics Hub", code: "04", icon: LineChart },
  { href: "/partner/settlements", label: "Settlements", code: "05", icon: Wallet },
  { href: "/partner/demand", label: "Live Demand Map", code: "06", icon: MapIcon },
];

export default function PartnerDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Global polling for pending requests
  const { data } = useSWR("/api/partner/bookings/pending", fetcher, { refreshInterval: 8000 });
  const pendingRequests = data?.bookings || [];
  const prevCount = useRef(0);

  useEffect(() => {
    const currentCount = pendingRequests.length;
    if (currentCount > prevCount.current) {
      // New request arrived!
      
      // 1. Haptic feedback (if supported)
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
      
      // 2. Audio Beep via Web Audio API
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          const ctx = new AudioContext();
          
          const playBeep = (startTime: number) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = "sine";
            osc.frequency.setValueAtTime(880, startTime); // High pitch (A5)
            
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.5, startTime + 0.05);
            gain.gain.linearRampToValueAtTime(0, startTime + 0.2);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(startTime);
            osc.stop(startTime + 0.2);
          };
          
          // Double beep
          const now = ctx.currentTime;
          playBeep(now);
          playBeep(now + 0.3);
        }
      } catch (e) {
        console.log("AudioContext blocked or not supported", e);
      }
    }
    prevCount.current = currentCount;
  }, [pendingRequests.length]);

  // Do not show the layout wrapper on the active-ride map screen
  if (pathname === "/partner/active-ride") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Ticker />
      <Nav onAuthRequired={() => {}} />
      <div className="mx-auto w-full max-w-[1400px] px-5 sm:px-8 py-6 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 flex-1">
        <aside className="hairline bg-card h-fit lg:sticky lg:top-[88px]">
          <div className="brick mono text-[10px] tracking-[0.22em] uppercase px-4 py-2 flex items-center justify-between">
            <span>Operator Console</span>
            <span className="text-signal">●</span>
          </div>
          <nav className="p-2 flex lg:flex-col gap-1 overflow-x-auto">
            {LINKS.map((l) => {
              const Icon = l.icon;
              const isActive = l.exact ? pathname === l.href : pathname.startsWith(l.href);
              
              const isPendingRequests = l.code === "01";
              const hasAlert = isPendingRequests && pendingRequests.length > 0;
              
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`group flex items-center gap-3 px-3 py-2.5 mono text-[11px] tracking-[0.18em] uppercase transition-colors shrink-0 ${
                    isActive ? "bg-ink text-bone" : "hover:bg-secondary"
                  }`}
                >
                  <span className={isActive ? "text-bone/60" : "text-muted-foreground"}>{l.code}</span>
                  <Icon className="h-3.5 w-3.5" />
                  <span className="truncate">{l.label}</span>
                  {hasAlert && <span className="ml-auto w-2 h-2 bg-signal rounded-full animate-pulse" />}
                </Link>
              );
            })}
          </nav>
          <div className="hairline-t px-4 py-3 mono text-[9px] tracking-[0.22em] uppercase text-muted-foreground">
            <div className="flex justify-between"><span>Build</span><span>v0.24.06</span></div>
            <div className="flex justify-between"><span>Region</span><span>SXR · IN</span></div>
          </div>
        </aside>
        <main className="min-w-0">
          {children}
        </main>
      </div>
      <Foot />
    </div>
  );
}
