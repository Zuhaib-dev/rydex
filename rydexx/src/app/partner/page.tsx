"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then(res => res.json());
import {
  ArrowUpRight,
  Cloud,
  Wind,
  Droplets,
  Thermometer,
  Flame,
  Target,
  AlertTriangle,
  Fuel,
  Gauge,
  CircleDot,
  Crosshair,
  ArrowRight,
} from "lucide-react";


export default function Overview() {
  return (
    <div className="space-y-6">
      <OperatorHeader />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <VehicleStatus />
        <HubControl />
      </div>
      <FinancialLedger />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Streak />
        <DailyGoal />
      </div>
      <DispatchAlert />
      <Efficiency />
    </div>
  );
}

/* -------- shared bits -------- */
function Panel({
  code,
  title,
  children,
  accent,
  className = "",
}: {
  code: string;
  title: string;
  children: React.ReactNode;
  accent?: string;
  className?: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`relative hairline bg-card ${className}`}
    >
      <Crosshairs />
      <header className="hairline-b flex items-center justify-between px-4 py-2 mono text-[10px] tracking-[0.22em] uppercase">
        <span className="text-muted-foreground">{code}</span>
        <span className="truncate">{title}</span>
        <span className={accent ?? "text-signal"}>●</span>
      </header>
      <div className="p-5">{children}</div>
    </motion.section>
  );
}

function Crosshairs() {
  return (
    <>
      <span className="absolute -top-1 -left-1 w-2 h-2 border-l border-t border-foreground" />
      <span className="absolute -top-1 -right-1 w-2 h-2 border-r border-t border-foreground" />
      <span className="absolute -bottom-1 -left-1 w-2 h-2 border-l border-b border-foreground" />
      <span className="absolute -bottom-1 -right-1 w-2 h-2 border-r border-b border-foreground" />
    </>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="hairline p-4 bg-background">
      <div className="mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground">{label}</div>
      <div className="serif text-[28px] font-black leading-none tracking-tighter mt-2">{value}</div>
      {sub && <div className="mono text-[10px] tracking-[0.15em] uppercase text-muted-foreground mt-2">{sub}</div>}
    </div>
  );
}

/* -------- 1. Header -------- */
function OperatorHeader() {
  const { data: session } = useSession();
  const name = session?.user?.name || "Partner";
  const id = session?.user?.id?.slice(-4) || "0000";
  const { data: weather } = useSWR("/api/weather", fetcher);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative hairline bg-card"
    >
      <Crosshairs />
      <div className="brick mono text-[10px] tracking-[0.22em] uppercase px-4 py-1.5 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <CircleDot className="h-3 w-3 text-signal animate-blink" />
          Live Partner · Session 24H
        </span>
        <span>SXR · 34.08°N</span>
      </div>
      <div className="p-6 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6">
        <div className="min-w-0">
          <div className="mono text-[10px] tracking-[0.22em] uppercase text-signal mb-2">Operator N° {id}</div>
          <h1 className="serif text-[44px] md:text-[56px] leading-[0.92] font-black tracking-tighter">
            {name}.
          </h1>
          <p className="serif italic text-[18px] mt-3 max-w-xl text-foreground/80">
            Partner Dashboard — your account is{" "}
            <span className="bg-signal text-bone px-1.5">approved</span> and ready to receive rides.
          </p>
        </div>
        <div className="hairline bg-background p-4 min-w-[260px]">
          <div className="mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground flex items-center justify-between">
            <span>{weather?.name ?? "Srinagar"} · Field</span>
            <Cloud className="h-3.5 w-3.5" />
          </div>
          <div className="serif text-[38px] font-black leading-none tracking-tighter mt-2">{weather?.temp ?? "--"}°C</div>
          <div className="mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground mt-1">{weather?.description ?? "--"}</div>
          <div className="mt-3 grid grid-cols-3 gap-2 mono text-[10px] tracking-[0.15em] uppercase">
            <span className="flex items-center gap-1"><Thermometer className="h-3 w-3 text-signal" />{weather?.feelsLike ?? "--"}°</span>
            <span className="flex items-center gap-1"><Droplets className="h-3 w-3 text-signal" />{weather?.humidity ?? "--"}%</span>
            <span className="flex items-center gap-1"><Wind className="h-3 w-3 text-signal" />{weather?.windSpeed ?? "--"} m/s</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* -------- 2. Vehicle -------- */
function VehicleStatus() {
  const { data: res } = useSWR("/api/vehicles", fetcher);
  const vehicles = res?.vehicles || [];
  const activeId = res?.activeVehicleId;
  const activeVehicle = vehicles.find((v: any) => v._id === activeId) || vehicles[0];

  return (
    <Panel code="VEH / 02" title="Active Vehicle" className="lg:col-span-1">
      <div className="flex items-center gap-2 mono text-[10px] tracking-[0.22em] uppercase mb-3">
        {activeVehicle ? <span className="signal-chip px-2 py-0.5">Live on Rydex</span> : <span className="bg-ink text-bone px-2 py-0.5">No Active</span>}
      </div>
      <div className="serif text-[34px] font-black leading-none tracking-tighter capitalize">{activeVehicle?.vehicleModel || "Unknown"}</div>
      <div className="mono text-[11px] tracking-[0.18em] uppercase text-muted-foreground mt-2">
        Plate · <span className="text-foreground">{activeVehicle?.vehicleNumber || "----"}</span>
      </div>
      <div className="tick h-2 my-4" />
      <Link href="/partner/vehicle" className="group w-full flex items-center justify-between hairline bg-background hover:bg-secondary transition-colors px-3 py-2.5 mono text-[10px] tracking-[0.22em] uppercase cursor-pointer">
        Change Active
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </Panel>
  );
}

/* -------- 3. Hub Control Toggle -------- */
function HubControl() {
  const [mode, setMode] = useState<"solo" | "fleet">("solo");
  return (
    <Panel code="HUB / 03" title="Control Center" className="lg:col-span-2">
      <div className="mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-2">
        Driver Performance Control
      </div>
      <p className="serif italic text-[15px] text-foreground/80 max-w-xl">
        Track your individual ratings, personal streak metrics, and payout logs.
      </p>
      <div className="mt-4 hairline grid grid-cols-2 bg-background">
        {(["solo", "fleet"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`relative px-4 py-3 mono text-[11px] tracking-[0.22em] uppercase cursor-pointer transition-colors ${
              mode === m ? "brick" : "hover:bg-secondary"
            }`}
          >
            {m === "solo" ? "Solo Operator" : "Fleet Enterprise"}
            {mode === m && (
              <motion.span
                layoutId="hubchip"
                className="absolute top-1 right-1 mono text-[9px] tracking-[0.18em] bg-signal text-bone px-1"
              >
                ON
              </motion.span>
            )}
          </button>
        ))}
      </div>
    </Panel>
  );
}

/* -------- 4. Ledger -------- */
function FinancialLedger() {
  const { data: res } = useSWR("/api/partner/analytics", fetcher);
  const data = res?.data?.summary;

  return (
    <Panel code="LEDG / 04" title="Financial Overview" accent="text-acid">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="hairline p-5 bg-background">
          <div className="mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground">Gross Earnings</div>
          <div className="serif text-[52px] font-black leading-none tracking-tighter mt-3">₹{data?.totalEarnings ?? 0}</div>
          <div className="mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground mt-3">
            {data?.totalRides ?? 0} total bookings dispatched
          </div>
          <div className="tick h-2 mt-4" />
        </div>
        <div className="hairline p-5 bg-background">
          <div className="mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground flex items-center justify-between">
            Stripe · Net Payout
            <span className="signal-chip px-1.5 py-0.5 text-[9px]">SETTLED</span>
          </div>
          <div className="serif text-[52px] font-black leading-none tracking-tighter mt-3">₹{data?.stripePayouts ?? 0}</div>
          <div className="mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground mt-3">
            Transferred straight to bank
          </div>
          <div className="tick h-2 mt-4" />
        </div>
      </div>
    </Panel>
  );
}

/* -------- 5. Streak -------- */
function Streak() {
  const { data: res } = useSWR("/api/partner/analytics", fetcher);
  const streaks = res?.data?.streaks;

  return (
    <Panel code="STRK / 05" title="Active Streak">
      <div className="flex items-end gap-4">
        <Flame className="h-12 w-12 text-signal" />
        <div>
          <div className="serif text-[64px] font-black leading-none tracking-tighter">{streaks?.currentStreak ?? 0}</div>
          <div className="mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground mt-1">Days</div>
        </div>
      </div>
      <p className="serif italic text-[15px] mt-4 text-foreground/80">Keep the drive going. 🔥</p>
    </Panel>
  );
}

/* -------- 6. Daily Goal -------- */
function DailyGoal() {
  const { data: res } = useSWR("/api/partner/analytics", fetcher);
  const streaks = res?.data?.streaks;
  const completed = streaks?.ridesToday ?? 0;
  const total = streaks?.dailyGoal ?? 5;
  const bonus = streaks?.dailyGoalBonus ?? 250;
  const pct = total > 0 ? (completed / total) * 100 : 0;
  return (
    <Panel code="GOAL / 06" title="Today's Ride Bonus" accent="text-acid">
      <div className="flex items-start gap-3">
        <Target className="h-5 w-5 text-signal mt-1" />
        <p className="serif text-[18px] leading-snug">
          Complete <span className="bg-ink text-bone px-1.5">{total} rides</span> today to unlock an extra{" "}
          <span className="bg-signal text-bone px-1.5">₹{bonus}</span> bonus.
        </p>
      </div>
      <div className="mt-5">
        <div className="flex items-center justify-between mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-2">
          <span>{completed} of {total} rides</span>
          <span>{pct.toFixed(0)}%</span>
        </div>
        <div className="hairline h-3 bg-background relative overflow-hidden tick">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute inset-y-0 left-0 bg-signal"
          />
        </div>
        <div className="mt-2 grid grid-cols-5 gap-1">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 ${i < completed ? "bg-signal" : "bg-border"}`}
            />
          ))}
        </div>
      </div>
    </Panel>
  );
}

/* -------- 7. AI Dispatch Alert -------- */
function DispatchAlert() {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative hairline bg-ink text-bone"
    >
      <Crosshairs />
      <div className="px-4 py-1.5 mono text-[10px] tracking-[0.22em] uppercase flex items-center justify-between bg-signal text-bone">
        <span className="flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5" /> AI DISPATCH · ALERT 07
        </span>
        <span className="animate-blink">●</span>
      </div>
      <div className="p-6 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center">
        <div>
          <div className="mono text-[10px] tracking-[0.22em] uppercase text-signal mb-2">Low Demand in Sector</div>
          <p className="serif text-[26px] leading-tight font-black tracking-tight">
            Move <span className="bg-signal text-bone px-1.5">17.8 km North</span> to Lal Chowk to find bookings{" "}
            <span className="underline decoration-signal decoration-4 underline-offset-4">5× faster</span>.
          </p>
          <p className="mono text-[10px] tracking-[0.22em] uppercase text-bone/60 mt-3">
            Recommendation engine · Model R-04 · Confidence 0.91
          </p>
        </div>
        <Link href="/partner/demand" className="group inline-flex items-center gap-2 bg-bone text-ink px-5 py-3 mono text-[11px] tracking-[0.22em] uppercase hover:bg-signal hover:text-bone transition-colors cursor-pointer">
          Open Live Demand Map
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>
    </motion.div>
  );
}

/* -------- 8. Efficiency -------- */
function Efficiency() {
  const { data: res } = useSWR("/api/partner/analytics", fetcher);
  const fuel = res?.data?.fuel;
  const dist = res?.data?.summary?.totalDistanceKm ?? 0;

  return (
    <Panel code="EFF / 08" title="Efficiency Estimates">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] gap-4 items-end">
        <div>
          <div className="mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-1">Mileage Tracking · {fuel?.vehicleType?.toUpperCase() ?? "VEHICLE"}</div>
          <p className="serif italic text-[15px] text-foreground/80">
            Estimated fuel consumption tracking for your {fuel?.vehicleType?.toUpperCase() ?? "VEHICLE"} based on{" "}
            <span className="text-foreground not-italic font-bold">{dist} km</span>.
          </p>
        </div>
        <Stat label="Distance" value={`${dist}`} sub="Km · 30D" />
        <Stat label="Consumed" value={`${fuel?.consumed ?? 0} L`} sub={fuel?.fuelType ?? "Petrol"} />
        <Stat label="Fuel Cost" value={`₹${fuel?.estimatedCost ?? 0}`} sub={`Avg ₹${fuel?.pricePerUnit ?? 0} / L`} />
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3 mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground">
        <span className="flex items-center gap-2"><Gauge className="h-3.5 w-3.5 text-signal" /> Avg {fuel?.efficiency ?? 0} km/L</span>
        <span className="flex items-center gap-2"><Fuel className="h-3.5 w-3.5 text-signal" /> 8 refills</span>
        <span className="flex items-center gap-2"><CircleDot className="h-3.5 w-3.5 text-signal animate-blink" /> Live telemetry</span>
      </div>
    </Panel>
  );
}
