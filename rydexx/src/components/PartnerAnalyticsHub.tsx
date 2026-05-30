"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  TrendingUp, TrendingDown, Zap, Calendar, BarChart2, Star, Wallet,
  Flame, Award, Fuel, Percent, BadgeAlert, Layers, Trophy, CheckCircle, Info,
  MapPin, ShieldAlert, Cpu, Eye, Settings, RefreshCw, Radio, UserCheck, Play, Check, AlertTriangle
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell
} from "recharts";
import axios from "axios";

type TabType = "overview" | "operations" | "fleet" | "drivers" | "analytics" | "settlements" | "goals";
type TimeframeType = "daily" | "weekly" | "monthly";
type DashboardMode = "solo" | "fleet";

interface ChartItem {
  date: string;
  earnings: number;
  ridesCount: number;
}

interface AnalyticsData {
  summary: {
    totalEarnings: number;
    totalRides: number;
    stripePayouts: number;
    cashCollected: number;
    pendingCommission: number;
    totalDistanceKm: number;
  };
  fuel: {
    vehicleType: string;
    efficiency: number;
    fuelType: string;
    pricePerUnit: number;
    consumed: number;
    estimatedCost: number;
    netProfit: number;
  };
  streaks: {
    currentStreak: number;
    ridesToday: number;
    dailyGoal: number;
    dailyGoalBonus: number;
    dailyGoalAchieved: boolean;
  };
  charts: {
    daily: ChartItem[];
    weekly: ChartItem[];
    monthly: ChartItem[];
  };
}

interface FleetVehicle {
  id: string;
  number: string;
  type: string;
  fuelType: "EV" | "CNG" | "Petrol";
  level: number;
  status: "On Job" | "Available" | "Charging" | "Service";
  driver: string;
  speed: number;
}

interface FleetDriver {
  id: string;
  name: string;
  status: "Active" | "Idle" | "Offline";
  rating: number;
  safetyScore: number;
  earnings: number;
  coaching: string;
}

interface LiveBooking {
  id: string;
  pickup: string;
  drop: string;
  status: "Requested" | "In Progress" | "Completed";
  driver: string | null;
  fare: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl shadow-xl p-4 min-w-[140px]">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-xl font-bold text-gray-900 font-mono">₹{payload[0].value.toLocaleString("en-IN")}</p>
        <p className="text-[10px] text-gray-400 font-medium mt-1">{payload[0].payload.ridesCount} Completed Rides</p>
      </div>
    );
  }
  return null;
};

export default function PartnerAnalyticsHub() {
  const [dashboardMode, setDashboardMode] = useState<DashboardMode>("solo");
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [timeframe, setTimeframe] = useState<TimeframeType>("daily");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  // Enterprise Live State Simulation
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([
    { id: "v1", number: "HR-26-CH-8291", type: "Car", fuelType: "EV", level: 84, status: "On Job", driver: "Ranjeet K.", speed: 42 },
    { id: "v2", number: "HR-55-AP-2019", type: "Auto", fuelType: "CNG", level: 65, status: "Available", driver: "Suresh M.", speed: 0 },
    { id: "v3", number: "DL-3C-TY-4820", type: "Bike", fuelType: "EV", level: 12, status: "Charging", driver: "Vikram R.", speed: 0 },
    { id: "v4", number: "UP-16-DK-9034", type: "Truck", fuelType: "Petrol", level: 92, status: "Service", driver: "Pradeep S.", speed: 0 }
  ]);

  const [drivers, setDrivers] = useState<FleetDriver[]>([
    { id: "d1", name: "Ranjeet K.", status: "Active", rating: 4.8, safetyScore: 96, earnings: 3200, coaching: "Defensive driver. Cornering speed is highly optimal." },
    { id: "d2", name: "Suresh M.", status: "Idle", rating: 4.7, safetyScore: 92, earnings: 1850, coaching: "Harsh braking detected twice in highway zones." },
    { id: "d3", name: "Vikram R.", status: "Offline", rating: 4.6, safetyScore: 88, earnings: 1200, coaching: "Frequent excessive idling. Advise shutting engine at red signals." },
    { id: "d4", name: "Pradeep S.", status: "Active", rating: 4.95, safetyScore: 98, earnings: 4100, coaching: "Exceptional efficiency index. Top rating across sector 62 Noida." }
  ]);

  const [bookings, setBookings] = useState<LiveBooking[]>([
    { id: "b1", pickup: "Sector 62, Noida", drop: "Cyber City, Gurugram", status: "In Progress", driver: "Ranjeet K.", fare: 850 },
    { id: "b2", pickup: "Connaught Place, Delhi", drop: "IGI Airport T3", status: "Requested", driver: null, fare: 620 },
    { id: "b3", pickup: "Saket Metro Station", drop: "GK-II M-Block", status: "Completed", driver: "Pradeep S.", fare: 380 }
  ]);

  const [selectedVehicle, setSelectedVehicle] = useState<FleetVehicle | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<FleetDriver | null>(null);
  const [mapCenterVehicle, setMapCenterVehicle] = useState<string | null>("v1");
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    axios
      .get("/api/partner/analytics")
      .then((res) => {
        if (res.data?.success) {
          setData(res.data.data);
        }
      })
      .catch((err) => console.error("Error fetching analytics data:", err))
      .finally(() => setLoading(false));
  }, []);

  const triggerToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Dispatch override handler
  const handleAssignDriver = (bookingId: string, driverName: string) => {
    setBookings(prev =>
      prev.map(b => (b.id === bookingId ? { ...b, status: "In Progress", driver: driverName } : b))
    );
    setDrivers(prev =>
      prev.map(d => (d.name === driverName ? { ...d, status: "Active" } : d))
    );
    setVehicles(prev =>
      prev.map(v => (v.driver === driverName ? { ...v, status: "On Job" } : v))
    );
    triggerToast(`Manually dispatched ${driverName} to booking ${bookingId}`);
  };

  // Fleet configuration change
  const handleVehicleDriverChange = (vehicleId: string, driverName: string) => {
    setVehicles(prev =>
      prev.map(v => (v.id === vehicleId ? { ...v, driver: driverName } : v))
    );
    triggerToast(`Reassigned ${driverName} to vehicle ID: ${vehicleId}`);
  };

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

  const { summary, fuel, streaks, charts } = data;
  const activeChartData = charts[timeframe];
  const chartValues = activeChartData.map((d) => d.earnings);
  const maxEarning = chartValues.length ? Math.max(...chartValues) : 0;

  // Local leaderboard representation
  const LEADERBOARD = [
    { rank: 1, name: "Pradeep S. (Your Driver)", rides: 38, bonus: "₹500", highlight: false },
    { rank: 2, name: "Ranjeet K. (Your Driver)", rides: 32, bonus: "₹300", highlight: false },
    { rank: 3, name: "Suresh M. (Your Driver)", rides: 29, bonus: "₹200", highlight: false },
    { rank: 4, name: "You (Overall Partner)", rides: summary.totalRides, bonus: streaks.dailyGoalAchieved ? "₹250" : "—", highlight: true },
    { rank: 5, name: "Vikram R. (Your Driver)", rides: 24, bonus: "—", highlight: false },
  ];

  return (
    <div className="w-full bg-white rounded-[32px] border border-gray-100 shadow-[0_8px_30px_rgba(0,0,0,0.02)] p-6 relative overflow-hidden">
      
      {/* ── ALERTS NOTIFICATION POPUP ── */}
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

      {/* ── TOP CONTROL NAVIGATION & MODE SWITCHER ── */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between border-b border-gray-100 pb-6 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-[9px] font-black tracking-widest uppercase text-violet-700 bg-violet-50 px-3 py-1 rounded-full">
              <Layers size={11} />
              Hub Control Center
            </span>
            <span className="text-xs text-gray-400 font-bold">•</span>
            <div className="flex bg-gray-100 p-0.5 rounded-lg text-2xs font-bold uppercase tracking-wider">
              <button
                onClick={() => {
                  setDashboardMode("solo");
                  setActiveTab("overview");
                  triggerToast("Swapped to Solo Driver Dashboard");
                }}
                className={`px-3 py-1 rounded-md transition ${dashboardMode === "solo" ? "bg-white text-black shadow-xs font-black" : "text-gray-400"}`}
              >
                Solo Operator
              </button>
              <button
                onClick={() => {
                  setDashboardMode("fleet");
                  setActiveTab("overview");
                  triggerToast("Swapped to Fleet Enterprise Dashboard");
                }}
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

        {/* Dynamic Tabs list based on Solo vs Fleet mode */}
        <div className="flex bg-gray-100 p-1.5 rounded-2xl overflow-x-auto self-start lg:self-center">
          {([
            { id: "overview", label: "Overview" },
            ...(dashboardMode === "fleet"
              ? [
                  { id: "operations", label: "Live Command" },
                  { id: "fleet", label: "Fleet Directory" },
                  { id: "drivers", label: "Driver Hub" }
                ]
              : []),
            { id: "analytics", label: "Analytics" },
            { id: "settlements", label: "Settlements" },
            { id: "goals", label: "Targets & Leaderboard" }
          ] as { id: TabType; label: string }[]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-xs font-black tracking-wider rounded-xl transition-all duration-300 capitalize shrink-0 ${
                activeTab === tab.id
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-gray-400 hover:text-zinc-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        
        {/* ═══ TAB 1: OVERVIEW ═══ */}
        {activeTab === "overview" && (
          <motion.div
            key={`${dashboardMode}-overview`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Quick Balance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <div className="bg-linear-to-br from-zinc-900 to-zinc-800 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
                <div className="absolute right-4 top-4 bg-white/10 p-2 rounded-xl text-white/70">
                  <Wallet size={18} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-1">
                  {dashboardMode === "solo" ? "Gross Earnings" : "Aggregated Fleet Revenue"}
                </p>
                <h3 className="text-3xl font-black tracking-tight font-mono">
                  ₹{dashboardMode === "solo" ? summary.totalEarnings.toLocaleString("en-IN") : (summary.totalEarnings * 3.4).toLocaleString("en-IN")}
                </h3>
                <p className="text-xs text-white/60 mt-4 font-semibold">
                  {dashboardMode === "solo" ? summary.totalRides : Math.round(summary.totalRides * 3.4)} total bookings dispatched
                </p>
              </div>

              <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 relative overflow-hidden">
                <div className="absolute right-4 top-4 bg-emerald-500/10 p-2 rounded-xl text-emerald-600">
                  <Star size={18} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700/60 mb-1">
                  {dashboardMode === "solo" ? "Stripe Net Payout" : "Settled Fleet Payouts"}
                </p>
                <h3 className="text-3xl font-black tracking-tight text-emerald-700 font-mono">
                  ₹{dashboardMode === "solo" ? summary.stripePayouts.toLocaleString("en-IN") : (summary.stripePayouts * 3.4).toLocaleString("en-IN")}
                </h3>
                <p className="text-xs text-emerald-600/70 mt-4 font-bold">Transferred straight to bank</p>
              </div>

              <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-5 relative overflow-hidden">
                <div className="absolute right-4 top-4 bg-amber-500/10 p-2 rounded-xl text-amber-600">
                  <Flame size={18} className={streaks.currentStreak > 0 ? "animate-bounce" : ""} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700/60 mb-1">
                  {dashboardMode === "solo" ? "Active Streak" : "Online Fleet Utilization"}
                </p>
                <h3 className="text-3xl font-black tracking-tight text-amber-700 font-mono">
                  {dashboardMode === "solo" ? `${streaks.currentStreak} Days` : "92%"}
                </h3>
                <p className="text-xs text-amber-600/70 mt-4 font-bold">
                  {dashboardMode === "solo" ? "Keep the drive going! 🔥" : "18 active / 20 registered fleet drivers"}
                </p>
              </div>

            </div>

            {/* Performance and Efficiency estimates widgets */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              
              {/* Daily Target Progress */}
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 flex items-center justify-between gap-6">
                <div className="space-y-2">
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full">
                    <Award size={10} /> Daily Goal
                  </span>
                  <h4 className="text-lg font-bold text-gray-900">
                    {dashboardMode === "solo" ? "Today's Ride Bonus" : "Aggregated Shift Targets"}
                  </h4>
                  <p className="text-xs text-gray-400 font-medium">
                    {dashboardMode === "solo"
                      ? `Complete ${streaks.dailyGoal} rides today to unlock an extra ₹${streaks.dailyGoalBonus} bonus.`
                      : "Direct drivers to complete shifts. Current target threshold unlocks ₹2,500 fleet bonuses."}
                  </p>
                  
                  <div className="flex items-center gap-2 mt-4 text-sm font-black text-gray-800">
                    <span>
                      {dashboardMode === "solo"
                        ? `${streaks.ridesToday} of ${streaks.dailyGoal} rides`
                        : "72 of 85 fleet rides"}
                    </span>
                    {(streaks.dailyGoalAchieved || dashboardMode === "fleet") && (
                      <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1 font-bold">
                        <CheckCircle size={10} /> Unlocked
                      </span>
                    )}
                  </div>
                </div>

                <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="48" cy="48" r="38" strokeWidth="8" stroke="#e5e7eb" fill="transparent" />
                    <circle
                      cx="48" cy="48" r="38" strokeWidth="8"
                      stroke={streaks.dailyGoalAchieved || dashboardMode === "fleet" ? "#10b981" : "#000"}
                      strokeDasharray={2 * Math.PI * 38}
                      strokeDashoffset={(2 * Math.PI * 38) * (1 - (dashboardMode === "fleet" ? 72 : streaks.ridesToday) / (dashboardMode === "fleet" ? 85 : streaks.dailyGoal))}
                      strokeLinecap="round" fill="transparent"
                    />
                  </svg>
                  <span className="absolute text-xl font-bold font-mono">
                    {dashboardMode === "solo"
                      ? Math.round((Math.min(streaks.ridesToday, streaks.dailyGoal) / streaks.dailyGoal) * 100)
                      : 84}%
                  </span>
                </div>
              </div>

              {/* Fuel and Distance Snapshot */}
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 flex items-center justify-between gap-6">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full">
                    <Fuel size={10} /> Mileage tracking
                  </span>
                  <h4 className="text-lg font-bold text-gray-900">Efficiency Estimates</h4>
                  <p className="text-xs text-gray-400 font-medium">
                    {dashboardMode === "solo"
                      ? `Estimated fuel consumption tracking for your ${fuel.vehicleType.toUpperCase()} based on ${summary.totalDistanceKm} km.`
                      : `Estimated dynamic fleet mileage metrics calculated across ${Math.round(summary.totalDistanceKm * 3.4)} km.`}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 pt-3">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Consumed</p>
                      <p className="text-sm font-black text-gray-800 font-mono">
                        {dashboardMode === "solo"
                          ? `${fuel.consumed} L`
                          : `${Math.round(fuel.consumed * 3.4)} L`}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fuel Cost</p>
                      <p className="text-sm font-black text-gray-800 font-mono">
                        ₹{dashboardMode === "solo" ? fuel.estimatedCost : Math.round(fuel.estimatedCost * 3.2)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="w-14 h-14 bg-zinc-900 rounded-2xl flex items-center justify-center shrink-0 shadow-lg text-white">
                  <Fuel size={24} />
                </div>
              </div>

            </div>
          </motion.div>
        )}

        {/* ═══ TAB 2: LIVE OPERATIONS CENTER (FLEET ONLY) ═══ */}
        {activeTab === "operations" && dashboardMode === "fleet" && (
          <motion.div
            key="operations-center"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Left Column: Real-time Map Visual */}
            <div className="lg:col-span-8 space-y-4">
              <div className="bg-gray-900 text-white rounded-3xl p-6 relative overflow-hidden h-[450px] shadow-inner flex flex-col justify-between border border-gray-800">
                {/* Simulated Radar Wave */}
                <div className="absolute inset-0 bg-radial-to-t from-emerald-500/5 to-transparent pointer-events-none" />
                <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

                {/* Top Overlay HUD */}
                <div className="relative flex justify-between items-start z-10">
                  <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-2xs font-bold uppercase tracking-widest text-emerald-400">Live Telemetry Loop</span>
                  </div>

                  <div className="flex gap-2">
                    {vehicles.map(v => (
                      <button
                        key={v.id}
                        onClick={() => {
                          setMapCenterVehicle(v.id);
                          triggerToast(`Camera locked to vehicle ${v.number}`);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-2xs font-bold transition flex items-center gap-1.5 border ${
                          mapCenterVehicle === v.id
                            ? "bg-emerald-500 border-emerald-400 text-black"
                            : "bg-black/40 border-white/10 text-white/80 hover:bg-black/60"
                        }`}
                      >
                        <MapPin size={10} />
                        {v.number.split("-")[2]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* SVG Visual Map Board */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <svg className="w-5/6 h-5/6 opacity-75" viewBox="0 0 800 400">
                    {/* Simulated routes */}
                    <path d="M 100 200 Q 400 50 700 200" fill="none" stroke="#ffffff" strokeWidth="1" strokeDasharray="5,5" />
                    <path d="M 200 100 Q 400 300 600 100" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="8,4" />
                    <path d="M 150 350 L 650 350" fill="none" stroke="#22c55e" strokeWidth="1" />

                    {/* Surge demand blobs */}
                    <circle cx="450" cy="120" r="60" fill="#a855f7" className="animate-pulse opacity-10" />
                    <circle cx="280" cy="220" r="40" fill="#ec4899" className="animate-pulse opacity-10" />

                    {/* Booking pins */}
                    <g transform="translate(100, 200)">
                      <circle cx="0" cy="0" r="6" fill="#ef4444" />
                      <text x="10" y="4" fill="#ffffff" fontSize="9" fontWeight="bold">Pickup: #b2</text>
                    </g>
                    <g transform="translate(700, 200)">
                      <circle cx="0" cy="0" r="6" fill="#10b981" />
                    </g>

                    {/* Pulsing Vehicles pins */}
                    <g transform="translate(360, 125)" className="transition-all duration-1000">
                      <circle cx="0" cy="0" r="16" fill="rgba(16, 185, 129, 0.2)" className="animate-ping" />
                      <circle cx="0" cy="0" r="8" fill={mapCenterVehicle === "v1" ? "#10b981" : "#3b82f6"} />
                      <text x="10" y="-8" fill="#ffffff" fontSize="8" fontWeight="bold">Ranjeet K.</text>
                    </g>
                    <g transform="translate(480, 250)">
                      <circle cx="0" cy="0" r="8" fill={mapCenterVehicle === "v2" ? "#10b981" : "#3b82f6"} />
                      <text x="10" y="12" fill="#ffffff" fontSize="8" fontWeight="bold">Suresh M.</text>
                    </g>
                    <g transform="translate(200, 100)">
                      <circle cx="0" cy="0" r="10" fill="rgba(239, 68, 68, 0.2)" className="animate-ping" />
                      <circle cx="0" cy="0" r="6" fill="#ef4444" />
                      <text x="10" y="4" fill="#ffffff" fontSize="8" fontWeight="bold">Vikram (Charging)</text>
                    </g>
                  </svg>
                </div>

                {/* Bottom HUD readout */}
                <div className="relative z-10 flex justify-between items-end bg-black/60 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active Dispatch Target</p>
                    <h4 className="text-sm font-black text-white mt-1">
                      {mapCenterVehicle === "v1" ? "Ranjeet K. — EV Car (HR-26)" : ""}
                      {mapCenterVehicle === "v2" ? "Suresh M. — CNG Auto (HR-55)" : ""}
                      {mapCenterVehicle === "v3" ? "Vikram R. — EV Bike (DL-3C)" : ""}
                      {mapCenterVehicle === "v4" ? "Pradeep S. — Petrol Truck (UP-16)" : ""}
                    </h4>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      Status: {vehicles.find(v => v.id === mapCenterVehicle)?.status} | Level: {vehicles.find(v => v.id === mapCenterVehicle)?.level}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Current Velocity</p>
                    <h3 className="text-lg font-black text-emerald-400 font-mono mt-1">
                      {vehicles.find(v => v.id === mapCenterVehicle)?.speed} km/h
                    </h3>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Live Booking Activity & Override dispatch panel */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-gray-50 border border-gray-100 rounded-3xl p-5 h-full flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-200/50 pb-3">
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                      <Radio size={16} className="text-violet-600 animate-pulse" />
                      Active Fares Queue
                    </h3>
                    <span className="text-2xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-bold">
                      {bookings.filter(b => b.status !== "Completed").length} Pending
                    </span>
                  </div>

                  <div className="space-y-3 overflow-y-auto max-h-[300px]">
                    {bookings.map(b => (
                      <div key={b.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                              b.status === "Requested" ? "bg-amber-50 text-amber-600" :
                              b.status === "In Progress" ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"
                            }`}>
                              {b.status}
                            </span>
                            <h4 className="text-xs font-bold text-gray-900 mt-2">Fare Ref: {b.id.toUpperCase()}</h4>
                          </div>
                          <span className="text-sm font-black text-gray-900 font-mono">₹{b.fare}</span>
                        </div>

                        <div className="text-[11px] text-gray-400 font-medium space-y-1">
                          <p className="flex items-center gap-1"><MapPin size={10} className="text-rose-500" /> {b.pickup}</p>
                          <p className="flex items-center gap-1"><MapPin size={10} className="text-emerald-500" /> {b.drop}</p>
                        </div>

                        {/* Dispatch controls */}
                        <div className="border-t border-gray-50 pt-3 flex justify-between items-center flex-wrap gap-2">
                          <span className="text-2xs text-gray-400 font-bold">
                            Driver: {b.driver ? <span className="text-zinc-900">{b.driver}</span> : <span className="text-red-500">Unassigned ⚠️</span>}
                          </span>
                          {!b.driver && (
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => handleAssignDriver(b.id, "Suresh M.")}
                                className="px-2.5 py-1 bg-black text-white text-[10px] font-black rounded-lg hover:bg-gray-800 transition"
                              >
                                Assign Suresh
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-violet-50/50 border border-violet-100 rounded-2xl p-4 mt-4">
                  <div className="flex gap-2 items-start">
                    <Cpu size={16} className="text-violet-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-black text-violet-800 uppercase tracking-wider">AI Dispatch Dispatcher</p>
                      <p className="text-2xs text-violet-700 leading-relaxed mt-0.5">
                        High surge zone detected around **IGI Airport T3**. Moving **Suresh M.** there will yield up to 1.3x higher booking rate.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══ TAB 3: FLEET DIRECTORY (FLEET ONLY) ═══ */}
        {activeTab === "fleet" && dashboardMode === "fleet" && (
          <motion.div
            key="fleet-directory"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {vehicles.map(v => (
                <div
                  key={v.id}
                  onClick={() => setSelectedVehicle(v)}
                  className={`bg-white p-5 rounded-3xl border transition cursor-pointer flex flex-col gap-4 relative overflow-hidden shadow-xs hover:shadow-md hover:border-gray-200 ${
                    selectedVehicle?.id === v.id ? "ring-2 ring-black" : "border-gray-100"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{v.type}</span>
                      <h3 className="text-lg font-black text-gray-900 mt-0.5">{v.number}</h3>
                    </div>
                    <span className={`h-2.5 w-2.5 rounded-full ${
                      v.status === "Available" ? "bg-green-500 animate-pulse" :
                      v.status === "On Job" ? "bg-blue-500 animate-pulse" :
                      v.status === "Charging" ? "bg-amber-500 animate-pulse" : "bg-red-500"
                    }`} />
                  </div>

                  {/* Level Progress Gauge */}
                  <div>
                    <div className="flex justify-between text-2xs font-bold text-gray-400 uppercase mb-1.5">
                      <span>{v.fuelType} Capacity</span>
                      <span className="font-mono">{v.level}%</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${
                          v.level < 20 ? "bg-red-500" :
                          v.level < 60 ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${v.level}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs border-t border-gray-50 pt-3">
                    <span className="text-gray-400 font-semibold">Driver</span>
                    <span className="text-gray-900 font-bold">{v.driver}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Vehicle Details Side Drawer Override */}
            {selectedVehicle && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-50 border border-gray-100 p-6 rounded-3xl mt-6 flex flex-col lg:flex-row justify-between gap-6"
              >
                <div className="space-y-4 flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="text-xl font-black text-gray-900">Vehicle Inspector: {selectedVehicle.number}</h4>
                    <span className="text-xs bg-black text-white px-2.5 py-0.5 rounded-full font-bold">
                      {selectedVehicle.fuelType} Fuel System
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-gray-100">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Active Speed</span>
                      <span className="text-lg font-black text-gray-900 font-mono mt-1 block">{selectedVehicle.speed} km/h</span>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-gray-100">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Operational Status</span>
                      <span className="text-sm font-black text-emerald-600 uppercase mt-1 block">{selectedVehicle.status}</span>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-gray-100">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Assigned Driver</span>
                      <span className="text-sm font-black text-gray-900 mt-1 block">{selectedVehicle.driver}</span>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 font-mono">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">OBD-II Diagnosis</span>
                      <span className="text-xs font-bold text-emerald-500 uppercase mt-1 block">ALL SYSTEMS OK ✅</span>
                    </div>
                  </div>
                </div>

                <div className="w-full lg:w-80 shrink-0 bg-white p-4 rounded-2xl border border-gray-100 flex flex-col justify-between gap-4">
                  <div>
                    <h5 className="text-xs font-black text-gray-800 uppercase tracking-wider mb-2">Driver Assignment Panel</h5>
                    <select
                      className="w-full text-xs border border-gray-200 rounded-xl p-2.5 focus:ring-black focus:border-black"
                      value={selectedVehicle.driver}
                      onChange={(e) => handleVehicleDriverChange(selectedVehicle.id, e.target.value)}
                    >
                      {drivers.map(d => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => {
                      setVehicles(prev =>
                        prev.map(v => (v.id === selectedVehicle.id ? { ...v, status: "Service" } : v))
                      );
                      setSelectedVehicle(prev => prev ? { ...prev, status: "Service" } : null);
                      triggerToast(`Scheduled vehicle ${selectedVehicle.number} for maintenance.`);
                    }}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition"
                  >
                    Schedule Maintenance Reminders
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ═══ TAB 4: DRIVER HUB (FLEET ONLY) ═══ */}
        {activeTab === "drivers" && dashboardMode === "fleet" && (
          <motion.div
            key="driver-roster"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {drivers.map(d => (
                <div
                  key={d.id}
                  onClick={() => setSelectedDriver(d)}
                  className={`bg-white p-5 rounded-3xl border transition cursor-pointer flex flex-col justify-between gap-4 relative overflow-hidden shadow-xs hover:shadow-md hover:border-gray-200 ${
                    selectedDriver?.id === d.id ? "ring-2 ring-black" : "border-gray-100"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3 items-center">
                      <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-sm">
                        {d.name.substring(0, 2)}
                      </div>
                      <div>
                        <h4 className="text-base font-black text-gray-900">{d.name}</h4>
                        <span className={`inline-flex items-center gap-1.5 text-3xs font-black uppercase tracking-wider ${
                          d.status === "Active" ? "text-emerald-500" :
                          d.status === "Idle" ? "text-blue-500" : "text-gray-400"
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            d.status === "Active" ? "bg-emerald-500 animate-pulse" :
                            d.status === "Idle" ? "bg-blue-500 animate-pulse" : "bg-gray-300"
                          }`} />
                          {d.status} Status
                        </span>
                      </div>
                    </div>
                    <span className="text-sm font-black text-gray-900 font-mono">Today: ₹{d.earnings}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-y border-gray-50 py-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400 font-semibold">Rating</span>
                      <span className="font-bold flex items-center gap-0.5 text-zinc-800 font-mono">{d.rating} <Star size={10} className="fill-amber-400 text-amber-400" /></span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 font-semibold">Safety Score</span>
                      <span className={`font-bold font-mono ${
                        d.safetyScore >= 95 ? "text-emerald-600" :
                        d.safetyScore >= 90 ? "text-blue-600" : "text-amber-600"
                      }`}>{d.safetyScore}/100</span>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-3.5 flex gap-2 items-start">
                    <Cpu size={14} className="text-violet-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[9px] font-black text-violet-800 uppercase tracking-widest">AI Coaching Tip</p>
                      <p className="text-3xs text-violet-700 leading-relaxed font-semibold mt-0.5">{d.coaching}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* AI Scorecard Detail slide-out details */}
            {selectedDriver && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-zinc-900 text-white p-6 rounded-3xl mt-6 flex flex-col lg:flex-row justify-between gap-6"
              >
                <div className="space-y-4 flex-1">
                  <h4 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                    <Trophy size={20} className="text-amber-400" />
                    Driver Scorecard: {selectedDriver.name}
                  </h4>
                  <p className="text-xs text-white/50">Performance metrics calculated from live booking coordinates tracking streams.</p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block">Acceleration Index</span>
                      <span className="text-sm font-black text-white font-mono mt-1.5 block">Smooth Starts (98%)</span>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block">Cornering Speed G-Force</span>
                      <span className="text-sm font-black text-white font-mono mt-1.5 block">Low G-Force (0.24G)</span>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block">Harsh Braking Incidents</span>
                      <span className="text-sm font-black text-red-400 font-mono mt-1.5 block">0 Detected today</span>
                    </div>
                  </div>
                </div>

                <div className="w-full lg:w-80 shrink-0 bg-white/5 border border-white/5 p-5 rounded-2xl flex flex-col justify-between gap-4 text-xs">
                  <div>
                    <h5 className="font-black text-amber-400 uppercase tracking-wider mb-2">Driver Attendance & Duty</h5>
                    <p className="text-white/60">Shift started today at **08:30 AM**.</p>
                    <p className="text-white/60 mt-1">Uptime Hours: **8h 12m**</p>
                  </div>
                  <button
                    onClick={() => triggerToast(`Broadcast dispatch alerts sent to ${selectedDriver.name}`)}
                    className="w-full py-2.5 bg-white text-black font-black rounded-xl text-2xs transition hover:bg-white/90"
                  >
                    Send Performance Incentives Alert
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ═══ TAB 5: ANALYTICS (BOTH DRIVER & FLEET) ═══ */}
        {activeTab === "analytics" && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Header controls for chart */}
            <div className="flex items-center justify-between flex-wrap gap-4 bg-gray-50 border border-gray-100 px-5 py-4 rounded-2xl">
              <div>
                <h4 className="text-sm font-bold text-gray-900 capitalize">
                  {dashboardMode === "solo" ? `${timeframe} Earnings Trend` : `Aggregated ${timeframe} Fleet Revenue`}
                </h4>
                <p className="text-xs text-gray-400">Tapping items displays detail stats breakdown</p>
              </div>

              {/* Timeframe selector */}
              <div className="flex bg-gray-200 p-1 rounded-xl">
                {(["daily", "weekly", "monthly"] as TimeframeType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTimeframe(t)}
                    className={`px-3 py-1.5 text-2xs font-bold tracking-wider rounded-lg transition-all capitalize ${
                      timeframe === t
                        ? "bg-white text-zinc-900 shadow-sm"
                        : "text-gray-400 hover:text-zinc-900"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Recharts Graphical Display */}
            {activeChartData.length === 0 ? (
              <div className="h-64 border border-dashed rounded-2xl flex flex-col items-center justify-center bg-gray-50">
                <BarChart2 size={32} className="text-gray-400 mb-2" />
                <p className="text-sm font-bold text-gray-900">No earnings data for this timeframe</p>
              </div>
            ) : (
              <div className="h-64 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={
                      dashboardMode === "solo"
                        ? activeChartData
                        : activeChartData.map(c => ({ ...c, earnings: Math.round(c.earnings * 3.4) }))
                    }
                    barCategoryGap="25%"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: "#9ca3af", fontWeight: 500 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#9ca3af" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => "₹" + (v >= 1000 ? (v / 1000).toFixed(0) + "k" : v)}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "#fafafa", radius: 8 }} />
                    <Bar dataKey="earnings" radius={[6, 6, 2, 2]}>
                      {activeChartData.map((entry, index) => {
                        const isCurrent = index === activeChartData.length - 1;
                        const isBest = entry.earnings === maxEarning && !isCurrent;
                        return (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              isCurrent
                                ? "#10b981" // Current unit is green
                                : isBest
                                ? "#8b5cf6" // Best performance is violet
                                : "#3b82f6" // General bars are blue
                            }
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Chart Legend */}
            <div className="flex items-center gap-6 justify-center text-xs text-gray-500 pt-2 border-t border-gray-50">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                <span>Current Timeframe</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-violet-500" />
                <span>Best Peak Performance</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
                <span>General Earnings</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══ TAB 6: SETTLEMENTS ═══ */}
        {activeTab === "settlements" && (
          <motion.div
            key="settlements"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Financial Ledger grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* stripe and cash collections */}
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 space-y-4">
                <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Percent size={16} className="text-zinc-700" />
                  Ledger Splits & Payouts
                </h4>

                <div className="divide-y divide-gray-100">
                  <div className="flex justify-between py-3">
                    <span className="text-xs text-gray-400 font-semibold">Direct Digital Earnings (Online Payments)</span>
                    <span className="text-sm font-bold text-gray-900 font-mono">
                      ₹{dashboardMode === "solo" ? summary.stripePayouts : Math.round(summary.stripePayouts * 3.4)}
                    </span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="text-xs text-gray-400 font-semibold">Direct Cash Collections (Kept by you)</span>
                    <span className="text-sm font-bold text-gray-900 font-mono">
                      ₹{dashboardMode === "solo" ? summary.cashCollected : Math.round(summary.cashCollected * 3.4)}
                    </span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="text-xs text-gray-400 font-semibold">Pending Platform Commission (10%)</span>
                    <span className="text-sm font-bold text-red-600 font-mono">
                      ₹{dashboardMode === "solo" ? summary.pendingCommission : Math.round(summary.pendingCommission * 3.4)}
                    </span>
                  </div>
                </div>

                {(summary.pendingCommission > 0) && (
                  <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3.5 mt-2">
                    <BadgeAlert size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] font-black text-amber-800 uppercase tracking-wider">Settlement Notification</p>
                      <p className="text-2xs text-amber-700 mt-0.5 leading-relaxed font-medium">
                        You have collected cash bookings. The platform commission of ₹{dashboardMode === "solo" ? summary.pendingCommission : Math.round(summary.pendingCommission * 3.4)} will be automatically deducted from your upcoming digital Stripe payouts.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* fuel estimator detail */}
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 space-y-4">
                <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Fuel size={16} className="text-zinc-700" />
                  Fuel & Efficiency Estimator
                </h4>

                <div className="divide-y divide-gray-100">
                  <div className="flex justify-between py-3">
                    <span className="text-xs text-gray-400 font-semibold">Vehicle Economy Class</span>
                    <span className="text-sm font-bold text-gray-800 uppercase">{fuel.vehicleType}</span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="text-xs text-gray-400 font-semibold">Estimated Economy Rate</span>
                    <span className="text-sm font-bold text-gray-800 font-mono">{fuel.efficiency} km/{fuel.fuelType === "CNG" ? "kg" : "L"}</span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="text-xs text-gray-400 font-semibold">Fuel Price Average</span>
                    <span className="text-sm font-bold text-gray-800 font-mono">₹{fuel.pricePerUnit} per unit</span>
                  </div>
                  <div className="flex justify-between py-3 bg-zinc-900 text-white rounded-xl px-3.5 mt-2">
                    <span className="text-xs text-white/70 font-bold self-center">Est. Net Profit (Earnings - Fuel)</span>
                    <span className="text-lg font-black font-mono py-2">
                      ₹{dashboardMode === "solo" ? fuel.netProfit.toLocaleString("en-IN") : Math.round(fuel.netProfit * 3.4).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>

            </div>

            <div className="flex items-center gap-2.5 bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs text-gray-500 font-medium leading-relaxed">
              <Info size={16} className="text-gray-400 shrink-0" />
              <span>Fuel estimates are calculated using straight line travel multipliers and average vehicle metrics. Payout settlements are processed weekly every Monday directly to the bank account registered during onboarding.</span>
            </div>
          </motion.div>
        )}

        {/* ═══ TAB 7: TARGETS & LEADERBOARD ═══ */}
        {activeTab === "goals" && (
          <motion.div
            key="goals"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,1.3fr)] gap-6">
              
              {/* Left gamified streaks achievements */}
              <div className="space-y-4">
                <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Flame size={16} className="text-orange-500" />
                  Your Active Targets
                </h4>

                <div className="bg-linear-to-br from-amber-50 to-orange-50/50 border border-amber-100 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md">
                      <Flame size={20} className="animate-pulse" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-amber-900">Consecutive Days Streak</p>
                      <p className="text-xs text-amber-700/80 font-medium">Complete at least 1 booking daily to keep your streak.</p>
                    </div>
                  </div>

                  <div className="flex items-baseline gap-2 pt-2">
                    <span className="text-5xl font-black text-amber-800 font-mono">{streaks.currentStreak}</span>
                    <span className="text-sm font-bold text-amber-700">Days Active</span>
                  </div>

                  <div className="w-full h-2 bg-amber-200/50 rounded-full overflow-hidden mt-2">
                    <div
                      className="h-full bg-amber-500 rounded-full animate-pulse"
                      style={{ width: `${Math.min((streaks.currentStreak / 7) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] font-bold text-amber-600 tracking-wider text-right">{streaks.currentStreak}/7 Days to Streak Multiplier bonus (1.2x commission cut)</p>
                </div>

                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                      <Trophy size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">Streak Bonus Goal</p>
                      <p className="text-xs text-gray-400 font-medium">₹{streaks.dailyGoalBonus} bonus reward for {streaks.dailyGoal} rides.</p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                    streaks.dailyGoalAchieved ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"
                  }`}>
                    {streaks.dailyGoalAchieved ? "Claimed" : `${streaks.ridesToday}/${streaks.dailyGoal}`}
                  </div>
                </div>
              </div>

              {/* Regional Leaderboard Table */}
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 space-y-4">
                <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Trophy size={16} className="text-amber-500" />
                  Regional Leaderboard
                </h4>
                <p className="text-xs text-gray-400">Weekly rankings based on completed rides in your local sector.</p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200/80 text-gray-400 font-bold uppercase tracking-wider">
                        <th className="py-2.5 pl-2">Rank</th>
                        <th className="py-2.5">Driver</th>
                        <th className="py-2.5">Rides Completed</th>
                        <th className="py-2.5 pr-2 text-right">Est. Bonus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {LEADERBOARD.map((driver) => (
                        <tr
                          key={driver.rank}
                          className={`transition ${
                            driver.highlight
                              ? "bg-zinc-900 text-white font-bold rounded-xl"
                              : "text-gray-700 hover:bg-gray-100/50"
                          }`}
                        >
                          <td className="py-3 pl-3.5 rounded-l-xl font-mono">#{driver.rank}</td>
                          <td className="py-3">{driver.name}</td>
                          <td className="py-3 font-mono">{driver.rides} rides</td>
                          <td className="py-3 pr-3.5 text-right font-mono rounded-r-xl text-emerald-600 font-semibold">{driver.bonus}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </motion.div>
        )}

      </AnimatePresence>

    </div>
  );
}
