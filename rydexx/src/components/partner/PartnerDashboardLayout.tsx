"use client";

import Link from "next/link";
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
