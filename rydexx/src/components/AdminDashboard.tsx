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
import Image from "next/image";
import ContentList from "./ContentList";
import AdminEarningsChart from "./AdminEarning";
import AdminLiveMap from "./AdminLiveMap";
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
import Nav from "@/components/Nav";
import PartnerDashboard from "@/components/PartnerDashboard";
import PublicHome from "@/components/PublicHome";

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
        <div className="flex-1">
          {userData?.role === "partner" ? (
            <>
              <Nav />
              <PartnerDashboard />
            </>
          ) : (
            <>
              <Nav />
              <PublicHome />
            </>
          )}
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
    <div className="min-h-screen bg-[#F5F5F7] flex text-black">
      {/* Desktop Sidebar */}
      <aside className={`hidden border-r border-gray-100 bg-white md:block transition-all duration-300 shrink-0 ${
        sidebarCollapsed ? "w-[78px]" : "w-[260px]"
      }`}>
        <SidebarContent />
      </aside>

      {/* Mobile Drawer Sidebar */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileSidebarOpen(false)}
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="relative w-[260px] bg-white h-full border-r border-gray-100"
            >
              <SidebarContent />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Global Top Header */}
        <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur-xl shrink-0">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 active:scale-95 md:hidden"
              >
                <Menu size={18} />
              </button>
              <h1 className="text-base sm:text-lg font-black uppercase tracking-tight text-gray-900 hidden sm:block">
                {activeTab === "overview" && "Dispatch Command Center"}
                {activeTab === "map" && "Control Tower Map"}
                {activeTab === "queues" && "Operations Queue"}
                {activeTab === "users" && "User Directory"}
                {activeTab === "vehicles" && "Vehicle Directory"}
                {activeTab === "coupons" && "Promo Coupons Manager"}
                {activeTab === "notifications" && "Broadcast Notifications"}
                {activeTab === "security" && "Security Logs"}
                {activeTab === "health" && "System Telemetry"}
                {activeTab === "observability" && "System Observability"}
              </h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Netlify Deploy Status Badge */}
              <a 
                href="https://app.netlify.com/projects/rydexx/deploys" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hidden sm:inline-block hover:opacity-85 transition-opacity shrink-0"
              >
                <img 
                  src="https://api.netlify.com/api/v1/badges/a5ed84fe-b787-4f6c-8e53-c55f72061d3c/deploy-status" 
                  alt="Netlify Status" 
                  className="h-5"
                />
              </a>

              <AdminLiveIndicator />
              <button
                type="button"
                onClick={() => void refetch()}
                disabled={refreshing}
                className="hidden h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-gray-300 hover:text-gray-900 disabled:opacity-50 sm:flex"
                aria-label="Refresh dashboard"
              >
                <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
              </button>
              <div className="hidden items-center gap-2 rounded-full bg-black px-4 py-2 text-xs font-bold uppercase tracking-widest text-white shadow-lg sm:flex">
                <ShieldCheck size={14} />
                Admin
              </div>

              {/* Profile Menu */}
              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => setProfileOpen((open) => !open)}
                  className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-black text-sm font-black text-white shadow-sm transition hover:scale-[1.03]"
                  aria-label="Open admin profile menu"
                >
                  {profileImage ? (
                    <Image
                      src={profileImage}
                      alt={profileName}
                      width={44}
                      height={44}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                      unoptimized
                    />
                  ) : (
                    profileName.charAt(0).toUpperCase()
                  )}
                </button>

                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.98 }}
                      transition={{ duration: 0.16 }}
                      className="absolute right-0 top-14 w-[330px] overflow-hidden rounded-2xl border border-black/10 bg-white text-black shadow-[0_24px_80px_rgba(0,0,0,0.18)] z-50"
                    >
                      <div className="bg-black px-5 py-5 text-white">
                        <div className="flex items-center gap-4">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/20 bg-white text-xl font-black text-black">
                            {profileImage ? (
                              <Image
                                src={profileImage}
                                alt={profileName}
                                width={56}
                                height={56}
                                className="h-full w-full object-cover"
                                referrerPolicy="no-referrer"
                                unoptimized
                              />
                            ) : (
                              profileName.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-base font-bold">{profileName}</p>
                            <p className="mt-1 truncate text-sm text-white/60">
                              {profileEmail}
                            </p>
                            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-black">
                              <ShieldCheck size={12} />
                              {profileRole}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 px-5 py-4">
                        <AdminProfileDetail
                          icon={<Mail size={16} />}
                          label="Email"
                          value={profileEmail}
                        />
                        <AdminProfileDetail
                          icon={<ShieldCheck size={16} />}
                          label="Access level"
                          value={profileRole}
                        />
                      </div>

                      <div className="border-t border-gray-100 px-3 py-3">
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                        >
                          <LogOut size={16} />
                          Logout
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        {/* Workspace Viewport */}
        <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-6 space-y-8 max-w-7xl w-full mx-auto">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            >
              <div className="flex items-center gap-2">
                <AlertCircle size={16} />
                {error}
              </div>
              <button
                type="button"
                onClick={() => void refetch()}
                className="font-semibold underline-offset-2 hover:underline"
              >
                Retry
              </button>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
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

              {/* --- VIEW: LIVE MAP --- */}
              {activeTab === "map" && <AdminLiveMap />}

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
    </div>
  );
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

export default function AdminDashboard() {
  return (
    <AdminRealtimeProvider>
      <AdminDashboardContent />
    </AdminRealtimeProvider>
  );
}
