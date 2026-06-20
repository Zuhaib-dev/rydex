"use client";

import { useEffect, useState, Suspense, lazy } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Layers, Radio } from "lucide-react";
import axios from "axios";
import useSWR from "swr";
import dynamic from "next/dynamic";

// Shared types
import type {
  TabType, TimeframeType, DashboardMode,
  AnalyticsData, FleetVehicle, FleetDriver, LiveBooking,
} from "./partner/analytics/types";

import type { ComponentType } from "react";

// Direct imports for tab components — Next.js dynamic() with ssr:false handles
// the code-splitting at the Next.js layer. We cast to ComponentType<any> to
// satisfy TS JSX props checking while maintaining dynamic loading.
const OverviewTab: any    = dynamic(() => import("./partner/analytics/OverviewTab").then(m => m.OverviewTab),    { ssr: false, loading: () => <TabSkeleton /> });
const AnalyticsTab: any   = dynamic(() => import("./partner/analytics/AnalyticsTab").then(m => m.AnalyticsTab),  { ssr: false, loading: () => <TabSkeleton /> });
const SettlementsTab: any = dynamic(() => import("./partner/analytics/SettlementsTab").then(m => m.SettlementsTab), { ssr: false, loading: () => <TabSkeleton /> });
const GoalsTab: any       = dynamic(() => import("./partner/analytics/GoalsTab").then(m => m.GoalsTab),          { ssr: false, loading: () => <TabSkeleton /> });
const OperationsTab: any  = dynamic(() => import("./partner/analytics/OperationsTab").then(m => m.OperationsTab), { ssr: false, loading: () => <TabSkeleton /> });
const FleetTab: any       = dynamic(() => import("./partner/analytics/FleetTab").then(m => m.FleetTab),          { ssr: false, loading: () => <TabSkeleton /> });
const DriversTab: any     = dynamic(() => import("./partner/analytics/DriversTab").then(m => m.DriversTab),      { ssr: false, loading: () => <TabSkeleton /> });
const PartnerDemandMap: any = dynamic(() => import("./partner/PartnerDemandMap"), { ssr: false });

// Default mock fleet state (fleet-mode only; not fetched from API)
const DEFAULT_VEHICLES: FleetVehicle[] = [
  { id: "v1", number: "HR-26-CH-8291", type: "Car",   fuelType: "EV",     level: 84, status: "On Job",    driver: "Ranjeet K.", speed: 42 },
  { id: "v2", number: "HR-55-AP-2019", type: "Auto",  fuelType: "CNG",    level: 65, status: "Available", driver: "Suresh M.",  speed: 0 },
  { id: "v3", number: "DL-3C-TY-4820", type: "Bike",  fuelType: "EV",     level: 12, status: "Charging",  driver: "Vikram R.",  speed: 0 },
  { id: "v4", number: "UP-16-DK-9034", type: "Truck", fuelType: "Petrol", level: 92, status: "Service",   driver: "Pradeep S.", speed: 0 },
];

const DEFAULT_DRIVERS: FleetDriver[] = [
  { id: "d1", name: "Ranjeet K.", status: "Active",  rating: 4.80, safetyScore: 96, earnings: 3200, coaching: "Defensive driver. Cornering speed is highly optimal." },
  { id: "d2", name: "Suresh M.",  status: "Idle",    rating: 4.70, safetyScore: 92, earnings: 1850, coaching: "Harsh braking detected twice in highway zones." },
  { id: "d3", name: "Vikram R.",  status: "Offline", rating: 4.60, safetyScore: 88, earnings: 1200, coaching: "Frequent excessive idling. Advise shutting engine at red signals." },
  { id: "d4", name: "Pradeep S.", status: "Active",  rating: 4.95, safetyScore: 98, earnings: 4100, coaching: "Exceptional efficiency index. Top rating across Srinagar and Budgam." },
];

const DEFAULT_BOOKINGS: LiveBooking[] = [
  { id: "b1", pickup: "Chadoora, Budgam",     drop: "Chanapora, Srinagar", status: "In Progress", driver: "Ranjeet K.", fare: 450, passengers: 2, notes: "Please arrive at back gate" },
  { id: "b2", pickup: "Dal Lake, Srinagar",   drop: "Lal Chowk, Srinagar", status: "Requested",   driver: null,         fare: 320, passengers: 1 },
  { id: "b3", pickup: "Lal Chowk, Srinagar", drop: "Chadoora, Budgam",    status: "Completed",   driver: "Pradeep S.", fare: 280, passengers: 4 },
];

function TabSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-3 gap-4">
        <div className="h-32 bg-gray-50 rounded-2xl" />
        <div className="h-32 bg-gray-50 rounded-2xl" />
        <div className="h-32 bg-gray-50 rounded-2xl" />
      </div>
      <div className="h-64 bg-gray-50 rounded-2xl" />
    </div>
  );
}

export default function PartnerAnalyticsHub() {
  // ── Mode / tab / timeframe ──────────────────────────────────────────
  const [dashboardMode, setDashboardMode] = useState<DashboardMode>("solo");
  const [activeTab, setActiveTab]         = useState<TabType>("overview");
  const [timeframe, setTimeframe]         = useState<TimeframeType>("daily");

  // ── Analytics data ──────────────────────────────────────────────────
  const [data, setData]               = useState<AnalyticsData | null>(null);
  const [loading, setLoading]         = useState(true);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [userStats, setUserStats]     = useState<any>(null);

  const fetcher = (url: string) => fetch(url).then((r) => r.json());
  const { data: demandData } = useSWR(
    dashboardMode === "solo" ? "/api/partner/demand" : null,
    fetcher,
    { refreshInterval: 20_000 },
  );

  useEffect(() => {
    Promise.all([
      axios.get("/api/partner/analytics").catch(() => null),
      axios.get("/api/partner/analytics/leaderboard").catch(() => null),
    ]).then(([analyticsRes, leaderboardRes]) => {
      if (analyticsRes?.data?.success) setData(analyticsRes.data.data);
      if (leaderboardRes?.data?.success) {
        setLeaderboard(leaderboardRes.data.data.leaderboard ?? []);
        setUserStats(leaderboardRes.data.data.userStats ?? null);
      }
    }).finally(() => setLoading(false));
  }, []);

  // ── Fleet state ─────────────────────────────────────────────────────
  const [vehicles, setVehicles]               = useState<FleetVehicle[]>(DEFAULT_VEHICLES);
  const [drivers, setDrivers]                 = useState<FleetDriver[]>(DEFAULT_DRIVERS);
  const [bookings, setBookings]               = useState<LiveBooking[]>(DEFAULT_BOOKINGS);
  const [selectedVehicle, setSelectedVehicle] = useState<FleetVehicle | null>(null);
  const [selectedDriver, setSelectedDriver]   = useState<FleetDriver | null>(null);
  const [mapCenterVehicle, setMapCenterVehicle] = useState<string | null>("v1");

  // ── Toast ───────────────────────────────────────────────────────────
  const [notification, setNotification] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // ── Fleet handlers ──────────────────────────────────────────────────
  const handleAssignDriver = (bookingId: string, driverName: string) => {
    setBookings((prev) => prev.map((b) => b.id === bookingId ? { ...b, status: "In Progress" as const, driver: driverName } : b));
    setDrivers((prev)  => prev.map((d) => d.name === driverName ? { ...d, status: "Active" as const } : d));
    setVehicles((prev) => prev.map((v) => v.driver === driverName ? { ...v, status: "On Job" as const } : v));
    triggerToast(`Manually dispatched ${driverName} to booking ${bookingId}`);
  };

  const handleVehicleDriverChange = (vehicleId: string, driverName: string) => {
    setVehicles((prev) => prev.map((v) => v.id === vehicleId ? { ...v, driver: driverName } : v));
    triggerToast(`Reassigned ${driverName} to vehicle ID: ${vehicleId}`);
  };

  const handleScheduleMaintenance = (vehicle: FleetVehicle) => {
    setVehicles((prev) => prev.map((v) => v.id === vehicle.id ? { ...v, status: "Service" as const } : v));
    setSelectedVehicle((prev) => prev ? { ...prev, status: "Service" as const } : null);
    triggerToast(`Scheduled vehicle ${vehicle.number} for maintenance.`);
  };

  // ── Tab definitions ─────────────────────────────────────────────────
  const tabs: { id: TabType; label: string }[] = [
    { id: "overview",    label: "Overview" },
    { id: "demand",      label: "Live Demand Map" },
    ...(dashboardMode === "fleet"
      ? [
          { id: "operations" as TabType, label: "Live Command" },
          { id: "fleet"      as TabType, label: "Fleet Directory" },
          { id: "drivers"    as TabType, label: "Driver Hub" },
        ]
      : []),
    { id: "analytics",   label: "Analytics" },
    { id: "settlements", label: "Settlements" },
    { id: "goals",       label: "Targets & Leaderboard" },
  ];

  // ── Loading skeleton ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="w-full bg-white rounded-[28px] border border-gray-100 p-8 shadow-sm flex flex-col gap-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded-full" />
        <div className="h-12 w-full bg-gray-100 rounded-2xl" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-32 bg-gray-50 rounded-2xl" />
          <div className="h-32 bg-gray-50 rounded-2xl" />
          <div className="h-32 bg-gray-50 rounded-2xl" />
        </div>
        <div className="h-64 bg-gray-50 rounded-2xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-full bg-white rounded-[28px] border border-gray-100 p-12 text-center shadow-sm">
        <p className="text-gray-500 font-medium">Failed to load financial records. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-[32px] border border-gray-100 shadow-[0_8px_30px_rgba(0,0,0,0.02)] p-6 relative overflow-hidden">

      {/* Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-black text-white px-6 py-3 rounded-full text-xs font-bold shadow-2xl flex items-center gap-2"
          >
            <Radio size={12} className="animate-pulse text-emerald-400" />
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header + mode switcher + tab bar */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between border-b border-gray-100 pb-6 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-[9px] font-black tracking-widest uppercase text-violet-700 bg-violet-50 px-3 py-1 rounded-full">
              <Layers size={11} /> Hub Control Center
            </span>
            <span className="text-xs text-gray-400 font-bold">•</span>
            <div className="flex bg-gray-100 p-0.5 rounded-lg text-2xs font-bold uppercase tracking-wider">
              <button
                onClick={() => { setDashboardMode("solo"); setActiveTab("overview"); triggerToast("Swapped to Solo Driver Dashboard"); }}
                className={`px-3 py-1 rounded-md transition ${dashboardMode === "solo" ? "bg-white text-black shadow-xs font-black" : "text-gray-400"}`}
              >
                Solo Operator
              </button>
              <button
                onClick={() => { setDashboardMode("fleet"); setActiveTab("overview"); triggerToast("Swapped to Fleet Enterprise Dashboard"); }}
                className={`px-3 py-1 rounded-md transition ${dashboardMode === "fleet" ? "bg-white text-black shadow-xs font-black" : "text-gray-400"}`}
              >
                Fleet Enterprise
              </button>
            </div>
          </div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight mt-3">
            {dashboardMode === "solo" ? "Driver Performance Control" : "Fleet Command Control Tower"}
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {dashboardMode === "solo"
              ? "Track your individual ratings, personal streak metrics, and payout logs."
              : "Enterprise gateway to track dispatch maps, vehicles battery health, and rosters."}
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex bg-gray-100 p-1.5 rounded-2xl overflow-x-auto self-start lg:self-center">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-xs font-black tracking-wider rounded-xl transition-all duration-300 capitalize shrink-0 ${
                activeTab === tab.id ? "bg-white text-zinc-900 shadow-sm" : "text-gray-400 hover:text-zinc-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">

        {activeTab === "overview" && (
          <OverviewTab
            key={`${dashboardMode}-overview`}
            data={data}
            dashboardMode={dashboardMode}
            demandData={demandData}
            onOpenDemandMap={() => setActiveTab("demand")}
          />
        )}

        {activeTab === "demand" && (
          <motion.div key="demand-map" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <PartnerDemandMap />
          </motion.div>
        )}

        {activeTab === "operations" && dashboardMode === "fleet" && (
          <OperationsTab
            key="operations"
            vehicles={vehicles}
            drivers={drivers}
            bookings={bookings}
            mapCenterVehicle={mapCenterVehicle}
            onCenterVehicle={(id: string) => { setMapCenterVehicle(id); triggerToast(`Camera locked to vehicle ${vehicles.find((v) => v.id === id)?.number}`); }}
            onAssignDriver={handleAssignDriver}
          />
        )}

        {activeTab === "fleet" && dashboardMode === "fleet" && (
          <FleetTab
            key="fleet"
            vehicles={vehicles}
            drivers={drivers}
            selectedVehicle={selectedVehicle}
            onSelectVehicle={setSelectedVehicle}
            onVehicleDriverChange={handleVehicleDriverChange}
            onScheduleMaintenance={handleScheduleMaintenance}
          />
        )}

        {activeTab === "drivers" && dashboardMode === "fleet" && (
          <DriversTab
            key="drivers"
            drivers={drivers}
            selectedDriver={selectedDriver}
            onSelectDriver={setSelectedDriver}
            onSendAlert={(d: FleetDriver) => triggerToast(`Broadcast dispatch alerts sent to ${d.name}`)}
          />
        )}

        {activeTab === "analytics" && (
          <AnalyticsTab
            key="analytics"
            data={data}
            dashboardMode={dashboardMode}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
          />
        )}

        {activeTab === "settlements" && (
          <SettlementsTab key="settlements" data={data} dashboardMode={dashboardMode} />
        )}

        {activeTab === "goals" && (
          <GoalsTab key="goals" data={data} leaderboard={leaderboard} userStats={userStats} />
        )}

      </AnimatePresence>
    </div>
  );
}
