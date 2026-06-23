"use client";

import { useEffect, useRef, useState } from "react";
import {
  Users,
  CheckCircle,
  Clock,
  XCircle,
  ShieldCheck,
  Video,
  Truck,
  LogOut,
  Mail,
  MapPin,
  RefreshCw,
  AlertCircle,
  LayoutDashboard,
  Lock,
  Activity,
  Menu,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Bell,
  BarChart2,
  Ticket,
} from "lucide-react";
import KPI from "./KPI";
import { motion, AnimatePresence } from "motion/react";
import { TrendingUp } from "lucide-react";
import Image from "next/image";
import ContentList from "./ContentList";
import AdminEarningsChart from "./AdminEarning";

import { signOut, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/redux/store";
import { setUserData, stopImpersonation } from "@/redux/userSlice";
import {
  AdminRealtimeProvider,
  useAdminRealtime,
} from "@/hooks/useAdminRealtime";
import { useAdminDashboardData } from "@/hooks/useAdminDashboardData";
import AdminLiveIndicator from "./admin/AdminLiveIndicator";
import UserManagement from "./admin/UserManagement";
import AuditLogs from "./admin/AuditLogs";
import SystemHealth from "./admin/SystemHealth";
import SendNotification from "./admin/SendNotification";
import AdminAnalyticsHub from "./AdminAnalyticsHub";
import AdminCoupons from "./admin/AdminCoupons";
import VehicleManagement from "./admin/VehicleManagement";
import ObservabilityDashboard from "./admin/ObservabilityDashboard";
import useSWR from "swr";

// Import user context layouts to support client-side impersonation

type TabType = "overview" | "map" | "queues" | "users" | "security" | "health" | "notifications" | "analytics" | "coupons" | "vehicles" | "observability";
type QueueSubTab = "partner" | "kyc" | "vehicle";

function AdminDashboardContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as TabType;
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  useEffect(() => {
    if (tabParam && [
      "overview", "analytics", "map", "queues", "users", "vehicles", 
      "coupons", "notifications", "security", "health", "observability"
    ].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const [queueTab, setQueueTab] = useState<QueueSubTab>("partner");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const fetcher = (url: string) => fetch(url).then((res) => res.json());
  const { data: recData } = useSWR(
    activeTab === "overview" ? "/api/admin/recommendations/index" : null,
    fetcher,
    { refreshInterval: 10000 }
  );
  const profileRef = useRef<HTMLDivElement>(null);
  
  const { data: session } = useSession();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { userData, isImpersonating } = useSelector((state: RootState) => state.user);
  const { lastUpdateAt } = useAdminRealtime();
  const { data, loading, refreshing, error, refetch } = useAdminDashboardData();

  const profileName = userData?.name || session?.user?.name || "Admin";
  const profileEmail = userData?.email || session?.user?.email || "Email not available";
  const profileRole = userData?.role || session?.user?.role || "admin";
  const profileImage = userData?.image || session?.user?.image || null;

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("fcm_token");
      if (token) {
        await fetch("/api/user/fcm-token", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        localStorage.removeItem("fcm_token");
      }
    } catch (err) {
      console.error("Error clearing FCM token on admin logout:", err);
    }
    await signOut({ redirect: false });
    dispatch(setUserData(null));
    setProfileOpen(false);
    router.push("/");
  };

  const getQueueItemsCount = (subTab: QueueSubTab) => {
    switch (subTab) {
      case "partner":
        return data?.pendingPartnerReviews?.length || 0;
      case "kyc":
        return data?.pendingVideoKYC?.length || 0;
      case "vehicle":
        return data?.pendingVehicleReviews?.length || 0;
      default:
        return 0;
    }
  };

  const totalPendingQueueCount = 
    (data?.pendingPartnerReviews?.length || 0) + 
    (data?.pendingVideoKYC?.length || 0) + 
    (data?.pendingVehicleReviews?.length || 0);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-black" />
        <p className="text-sm font-semibold text-gray-500">Loading control tower…</p>
      </div>
    );
  }

  // --- IMPERSONATION MODE RENDER ---
  if (isImpersonating) {
    return (
      <div className="w-full min-h-screen bg-[#fafafa] flex flex-col relative z-50">
        <div className="sticky top-0 z-50 bg-amber-500 text-white px-4 py-3 sm:px-6 font-bold text-xs sm:text-sm flex items-center justify-between shadow-lg border-b border-amber-600/35">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className="animate-pulse" />
            <span>
              Impersonating: <strong className="underline">{userData?.name}</strong> ({userData?.role}). Viewing app through their profile.
            </span>
          </div>
          <button 
            onClick={() => dispatch(stopImpersonation())}
            className="bg-white text-amber-600 px-4 py-2 rounded-xl text-xs font-black uppercase hover:bg-gray-100 active:scale-95 transition-all shadow"
          >
            Exit Simulation
          </button>
        </div>
                <div className="flex-1 p-8 flex items-center justify-center">
          <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm max-w-2xl text-center">
            <h2 className="text-xl font-bold mb-4">Simulation Mode Active</h2>
            <p className="text-gray-600">You are currently impersonating {userData?.name}. Client-side simulation of the Partner Dashboard has been deprecated following the migration to the new Next.js App Router architecture.</p>
          </div>
        </div>
      </div>
    );
  }

  const navLinks = [
    { id: "overview" as const, label: "Overview", icon: LayoutDashboard },
    { id: "analytics" as const, label: "Advanced Analytics", icon: BarChart2 },
    { id: "map" as const, label: "Control Tower Map", icon: MapPin },
    { id: "queues" as const, label: "Operations Queue", icon: Clock, badge: totalPendingQueueCount },
    { id: "users" as const, label: "User Directory", icon: Users },
    { id: "vehicles" as const, label: "Vehicle Directory", icon: Truck },
    { id: "coupons" as const, label: "Promo Codes", icon: Ticket },
    { id: "notifications" as const, label: "Broadcast", icon: Bell },
    { id: "security" as const, label: "Security Logs", icon: Lock },
    { id: "health" as const, label: "System Health", icon: Activity },
    { id: "observability" as const, label: "Observability Hub", icon: Activity },
  ];

  const SidebarContent = () => (
    <div className="flex h-full flex-col justify-between py-6">
      <div className="space-y-8 px-4">
        {/* Brand */}
        <div className={`flex items-center gap-3 ${sidebarCollapsed ? "justify-center" : "px-2"}`}>
          <Image
            src="/logo.png"
            alt="Rydex"
            width={32}
            height={32}
            className="h-8 w-8 object-contain"
          />
          {!sidebarCollapsed && (
            <span className="font-black text-xl uppercase tracking-tighter text-gray-900">
              Rydex
            </span>
          )}
        </div>

        {/* Links */}
        <nav className="space-y-1.5">
          {navLinks.map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              onClick={() => {
                if (id === "map") {
                  router.push("/admin/tower");
                  return;
                }
                setActiveTab(id);
                setMobileSidebarOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-bold transition-all ${
                activeTab === id
                  ? "bg-black text-white shadow-md shadow-black/5"
                  : "text-gray-400 hover:bg-gray-50 hover:text-gray-700"
              } ${sidebarCollapsed ? "justify-center" : ""}`}
              title={label}
            >
              <Icon size={18} className="shrink-0" />
              {!sidebarCollapsed && <span className="truncate">{label}</span>}
              {!sidebarCollapsed && badge !== undefined && badge > 0 && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Footer / Minimize */}
      <div className="px-4">
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-gray-400 hover:bg-gray-50 hover:text-gray-700 md:flex justify-center"
        >
          {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!sidebarCollapsed && <span>Collapse Sidebar</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {isImpersonating && (
        <div className="bg-signal text-bone py-2 px-4 flex justify-between items-center z-50 fixed bottom-0 w-full mono text-[10px] tracking-[0.2em] uppercase">
          <span>You are impersonating {userData?.name}</span>
          <button onClick={() => { dispatch(stopImpersonation()); router.push("/admin/dashboard"); }} className="underline font-bold">End Impersonation</button>
        </div>
      )}

      {isImpersonating ? (
        <div className="flex-1 p-8 flex items-center justify-center">
          <div className="bg-ink p-8 border border-bone/20 max-w-2xl text-center text-bone">
            <h2 className="text-xl font-bold mb-4 font-serif">Simulation Mode Active</h2>
            <p className="text-bone/60 mono text-[11px]">You are currently impersonating {userData?.name}. Client-side simulation of the Partner Dashboard has been deprecated following the migration to the new Next.js App Router architecture.</p>
          </div>
        </div>
      ) : (
        <>
          <Ticker />
          <Nav onAuthRequired={() => {}} />
          <div className="mx-auto w-full max-w-[1480px] px-5 sm:px-8 py-6 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 flex-1">
            <aside className="hairline bg-card h-fit lg:sticky lg:top-[88px] z-10">
              <div className="brick mono text-[10px] tracking-[0.22em] uppercase px-4 py-2 flex items-center justify-between">
                <span>Admin Control Tower</span>
                <span className="text-signal animate-blink">●</span>
              </div>
              <nav className="p-2 flex lg:flex-col gap-1 overflow-x-auto">
                {LINKS.map((l) => {
                  const Icon = l.icon;
                  const isActive = activeTab === l.id;
                  return (
                    <button
                      key={l.id}
                      onClick={() => setActiveTab(l.id as any)}
                      className={`group relative flex items-center gap-3 px-3 py-2.5 mono text-[11px] tracking-[0.18em] uppercase transition-colors shrink-0 ${isActive ? 'bg-ink text-bone' : 'hover:bg-ink/5'}`}
                    >
                      <span className={`${isActive ? 'text-bone/60' : 'text-muted-foreground group-hover:text-foreground'}`}>{l.code}</span>
                      <Icon className="h-3.5 w-3.5" />
                      <span className="truncate">{l.label}</span>
                      {l.live && (
                        <span className="ml-auto flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-signal animate-blink" />
                          <span className="text-[9px] tracking-[0.22em] text-signal">LIVE</span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
              <div className="hairline-t px-4 py-3 mono text-[9px] tracking-[0.22em] uppercase text-muted-foreground space-y-1">
                <div className="flex justify-between"><span>Build</span><span>v0.24.06</span></div>
                <div className="flex justify-between"><span>Cluster</span><span>SXR-PRD-01</span></div>
                <div className="flex justify-between"><span>Uptime</span><span className="text-signal">99.998%</span></div>
              </div>
            </aside>
            <main className="min-w-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                >
                  {/* --- VIEW: OVERVIEW --- */}
              {activeTab === "overview" && (
                <div className="space-y-8">
                  {/* KPI Cards */}
                  <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <KPI
                      title="Total Partners"
                      value={data?.totalPartners || 0}
                      icon={<Users size={20} />}
                      iconBgColor="bg-purple-50"
                      iconColor="text-purple-500"
                      pulsing={Boolean(lastUpdateAt)}
                    />
                    <KPI
                      title="Approved Partners"
                      value={data?.totalApprovedPartners || 0}
                      icon={<CheckCircle size={20} />}
                      iconBgColor="bg-blue-50"
                      iconColor="text-blue-500"
                      pulsing={Boolean(lastUpdateAt)}
                    />
                    <KPI
                      title="Pending Partners"
                      value={data?.totalPendingPartners || 0}
                      icon={<Clock size={20} />}
                      iconBgColor="bg-amber-50"
                      iconColor="text-amber-500"
                      pulsing={Boolean(lastUpdateAt)}
                    />
                    <KPI
                      title="Rejected Partners"
                      value={data?.totalRejectedPartners || 0}
                      icon={<XCircle size={20} />}
                      iconBgColor="bg-red-50"
                      iconColor="text-red-500"
                      pulsing={Boolean(lastUpdateAt)}
                    />
                  </section>

                  {/* Financials & Live Summary */}
                  <section className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
                    <AdminEarningsChart />
                    <div className="flex min-h-[360px] flex-col justify-between rounded-[28px] bg-black p-6 text-white shadow-[0_14px_40px_rgba(0,0,0,0.18)]">
                      <div>
                        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                          <ShieldCheck size={22} />
                        </div>
                        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/50">
                          Control Center
                        </p>
                        <h2 className="text-3xl font-black leading-tight tracking-tight">
                          Reviews, KYC, and revenue in one place.
                        </h2>
                        <p className="mt-4 text-sm leading-relaxed text-white/60">
                          Live sync across queues, map, and earnings. Driver locations
                          stream into the control tower while polling stays as backup.
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-3 pt-8">
                        {[
                          ["Online", data?.onlinePartners || 0],
                          ["Active", data?.activeRides || 0],
                          ["SOS", data?.activeSos || 0],
                        ].map(([label, value]) => (
                          <motion.div
                            key={label}
                            layout
                            className="rounded-2xl bg-white/10 px-4 py-3"
                          >
                            <AnimatePresence mode="popLayout">
                              <motion.p
                                key={String(value)}
                                initial={{ opacity: 0, scale: 0.92 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-2xl font-black tabular-nums"
                              >
                                {value}
                              </motion.p>
                            </AnimatePresence>
                            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-white/45">
                              {label}
                            </p>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </section>

                  {/* --- Guidance Adherence & Recommendation Logs --- */}
                  <section className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-[minmax(320px,0.65fr)_minmax(0,1.35fr)]">
                    
                    {/* Compliance circular progress gauge */}
                    <div className="bg-white border border-gray-100 rounded-[28px] p-6 shadow-sm flex flex-col justify-between">
                      <div>
                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full">
                          <Activity size={10} /> Allocation Index
                        </span>
                        <h3 className="text-lg font-black text-gray-900 mt-3">Guidance Adherence</h3>
                        <p className="text-xs text-gray-400 mt-1">Measures percentage of smart recommendations followed by online drivers.</p>
                      </div>

                      <div className="flex flex-col items-center justify-center my-6">
                        <div className="relative w-36 h-36 flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle cx="72" cy="72" r="58" strokeWidth="10" stroke="#f3f4f6" fill="transparent" />
                            <circle
                              cx="72"
                              cy="72"
                              r="58"
                              strokeWidth="10"
                              stroke="#a855f7"
                              strokeDasharray={2 * Math.PI * 58}
                              strokeDashoffset={(2 * Math.PI * 58) * (1 - (recData?.stats?.complianceRate || 75.0) / 100)}
                              strokeLinecap="round"
                              fill="transparent"
                              className="transition-all duration-1000 ease-out"
                            />
                          </svg>
                          <div className="absolute flex flex-col items-center">
                            <span className="text-3xl font-black text-zinc-900 tracking-tighter font-mono">
                              {recData?.stats?.complianceRate || "75.0"}%
                            </span>
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Adherence</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 border-t border-gray-50 pt-4 text-center">
                        <div>
                          <p className="text-sm font-black text-gray-800 font-mono">{recData?.stats?.followed || 0}</p>
                          <p className="text-[9px] text-gray-400 uppercase tracking-widest font-bold">Followed</p>
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-800 font-mono">{recData?.stats?.ignored || 0}</p>
                          <p className="text-[9px] text-gray-400 uppercase tracking-widest font-bold">Ignored</p>
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-800 font-mono">{recData?.stats?.pending || 0}</p>
                          <p className="text-[9px] text-gray-400 uppercase tracking-widest font-bold">Pending</p>
                        </div>
                      </div>
                    </div>

                    {/* Recommendation Audit Table */}
                    <div className="bg-white border border-gray-100 rounded-[28px] p-6 shadow-sm flex flex-col justify-between">
                      <div className="flex items-center justify-between border-b border-gray-50 pb-4 mb-4">
                        <div>
                          <h3 className="text-sm font-black uppercase tracking-wider text-gray-900">Driver Relocation Stream</h3>
                          <p className="text-2xs text-gray-400 font-bold uppercase mt-0.5">Real-time dispatch metrics</p>
                        </div>
                        <span className="text-2xs bg-purple-50 text-purple-700 px-3 py-1 rounded-full font-black uppercase tracking-wider">
                          Active Dispatch Index
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-separate border-spacing-y-2">
                          <thead>
                            <tr className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                              <th className="py-2 px-3">Driver</th>
                              <th className="py-2 px-3">Sector Target</th>
                              <th className="py-2 px-3 text-center">Distance</th>
                              <th className="py-2 px-3 text-center">Multiplier</th>
                              <th className="py-2 px-3 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {!recData?.recent?.length ? (
                              <tr>
                                <td colSpan={5} className="text-center py-6 text-gray-400 font-medium">No guidance logs streamed yet.</td>
                              </tr>
                            ) : (
                              recData.recent.slice(0, 5).map((log: any) => (
                                <tr key={log._id} className="bg-gray-50/50 hover:bg-gray-50 transition-colors">
                                  <td className="py-3 px-3 rounded-l-2xl font-bold">
                                    <div>{log.driverName}</div>
                                    <div className="text-[10px] text-gray-400 font-semibold">{log.driverEmail}</div>
                                  </td>
                                  <td className="py-3 px-3 font-semibold text-gray-800">{log.recommendedPlaceName}</td>
                                  <td className="py-3 px-3 text-center font-mono text-gray-500 font-semibold">{log.distanceKm} km</td>
                                  <td className="py-3 px-3 text-center font-mono text-purple-600 font-bold">{log.multiplier}x</td>
                                  <td className="py-3 px-3 rounded-r-2xl text-right">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                      log.status === "followed" ? "bg-emerald-50 text-emerald-600" :
                                      log.status === "ignored" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                                    }`}>
                                      {log.status}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </section>
                </div>
              )}

              {/* --- VIEW: ANALYTICS --- */}
              {activeTab === "analytics" && <AdminAnalyticsHub />}



              {/* --- VIEW: QUEUES --- */}
              {activeTab === "queues" && (
                <div className="space-y-6">
                  {/* Sub-tab navigation */}
                  <section className="flex flex-col gap-2 overflow-x-auto rounded-2xl border border-gray-100/50 bg-white p-2 shadow-sm md:flex-row">
                    {(
                      [
                        { id: "partner" as const, label: "Pending Partner Reviews", icon: Users },
                        { id: "kyc" as const, label: "Pending Video KYC", icon: Video },
                        { id: "vehicle" as const, label: "Pending Vehicle Reviews", icon: Truck },
                      ] as const
                    ).map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setQueueTab(id)}
                        className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-6 py-3 text-sm font-bold transition-all ${
                          queueTab === id
                            ? "bg-black text-white shadow-md"
                            : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                        }`}
                      >
                        <Icon size={16} />
                        <span>{label}</span>
                        <span
                          className={`ml-2 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${
                            queueTab === id
                              ? "bg-red-500 text-white"
                              : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          {getQueueItemsCount(id)}
                        </span>
                      </button>
                    ))}
                  </section>

                  {/* Sub-tab content */}
                  <section className="min-h-[400px] space-y-4">
                    <div className="flex items-center justify-between px-2">
                      <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                        {queueTab === "partner"
                          ? "Partner Reviews Queue"
                          : queueTab === "kyc"
                            ? "Video KYC Queue"
                            : "Vehicle Reviews Queue"}
                      </h2>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        {getQueueItemsCount(queueTab)} items
                      </span>
                    </div>

                    <AnimatePresence mode="wait">
                      <motion.div
                        key={queueTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                      >
                        {data && <ContentList data={data} activeTab={queueTab} refetch={refetch} />}
                      </motion.div>
                    </AnimatePresence>
                  </section>
                </div>
              )}

              {/* --- VIEW: USER MANAGEMENT --- */}
              {activeTab === "users" && <UserManagement />}

              {/* --- VIEW: VEHICLE DIRECTORY --- */}
              {activeTab === "vehicles" && <VehicleManagement />}

              {/* --- VIEW: COUPON MANAGEMENT --- */}
              {activeTab === "coupons" && <AdminCoupons />}

              {/* --- VIEW: NOTIFICATIONS --- */}
              {activeTab === "notifications" && <SendNotification />}

              {/* --- VIEW: SECURITY AUDIT --- */}
              {activeTab === "security" && <AuditLogs />}

              {/* --- VIEW: SYSTEM HEALTH --- */}
              {activeTab === "health" && <SystemHealth />}

              {/* --- VIEW: OBSERVABILITY HUB --- */}
              {activeTab === "observability" && <ObservabilityDashboard />}
            
                </motion.div>
              </AnimatePresence>
            </main>
          </div>
          <Foot />
        </>
      )}
    </div>  );
}

function AdminProfileDetail({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-700 shadow-sm">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          {label}
        </p>
        <p className="truncate text-sm font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}


import {
  LayoutGrid,
  LineChart,
  Map as MapIcon,
  Inbox,
  Users as UsersIcon,
  Truck as TruckIcon,
  Ticket as TicketIcon,
  Radio,
  ShieldAlert as ShieldAlertIcon,
  Activity as ActivityIcon,
  Eye,
  Wallet,
  Zap,
  AlertTriangle,
  CircleDot,
  Car
} from "lucide-react";
import Nav from "@/components/landing/sections/Nav";
import Ticker from "@/components/landing/sections/Ticker";
import Foot from "@/components/landing/sections/Foot";
import { PageHead, Panel, Crosshairs } from "@/components/partner/shared";

function ShieldHalt(props: { className?: string }) {
  return <AlertTriangle {...props} />;
}

const KPIS = [
  { code: "K-01", label: "Gross Revenue · 24H", value: "₹1,24,500", delta: "+12.4%", icon: Wallet },
  { code: "K-02", label: "Active Riders", value: "1,204", delta: "+318", icon: UsersIcon },
  { code: "K-03", label: "Live Drivers", value: "412", delta: "92%", icon: Car },
  { code: "K-04", label: "Conversion", value: "68.9%", delta: "+2.1%", icon: TrendingUp },
];

const EVENTS = [
  { time: "02:14", code: "EV-9981", type: "Vehicle Breakdown", region: "Lal Chowk", sev: "high" },
  { time: "02:09", code: "EV-9980", type: "Surge Pricing Activated", region: "SXR Airport", sev: "med" },
  { time: "01:58", code: "EV-9979", type: "Driver KYC Approved", region: "Rajbagh", sev: "low" },
  { time: "01:42", code: "EV-9978", type: "Refund Issued ₹420", region: "Dal Gate", sev: "med" },
  { time: "01:31", code: "EV-9977", type: "Promo Code BURST24 Created", region: "—", sev: "low" },
  { time: "01:12", code: "EV-9976", type: "Failed Payment ×3", region: "Hazratbal", sev: "high" },
];

const LINKS = [
  { id: "overview", label: "Overview", code: "00", icon: LayoutGrid },
  { id: "analytics", label: "Advanced Analytics", code: "01", icon: LineChart },
  { id: "map", label: "Control Tower Map", code: "02", icon: MapIcon },
  { id: "queues", label: "Operations Queue", code: "03", icon: Inbox, live: true },
  { id: "users", label: "User Directory", code: "04", icon: UsersIcon },
  { id: "vehicles", label: "Vehicle Directory", code: "05", icon: TruckIcon },
  { id: "coupons", label: "Promo Codes", code: "06", icon: TicketIcon },
  { id: "notifications", label: "Broadcast", code: "07", icon: Radio },
  { id: "security", label: "Security Logs", code: "08", icon: ShieldAlertIcon },
  { id: "health", label: "System Health", code: "09", icon: ActivityIcon },
  { id: "observability", label: "Observability Hub", code: "10", icon: Eye },
];



export default function AdminDashboard() {
  return (
    <AdminRealtimeProvider>
      <AdminDashboardContent />
    </AdminRealtimeProvider>
  );
}
