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
  const { data: eventsData } = useSWR(
    activeTab === "overview" ? "/api/admin/audit-logs?limit=6" : null,
    fetcher,
    { refreshInterval: 5000 }
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
                      onClick={() => {
                        if (l.id === "map") {
                          router.push("/admin/tower");
                          return;
                        }
                        setActiveTab(l.id as any);
                      }}
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
                <div className="space-y-6">
                  <PageHead
                    code="ADM / 00"
                    title="Control Tower"
                    subtitle={`All systems nominal · ${data?.onlinePartners || 0} vehicles streaming · last sync 0.4s ago`}
                  />

                  {/* KPI grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { code: "K-01", label: "Gross Revenue · 24H", value: "₹1,24,500", delta: "+12.4%", icon: Wallet },
                      { code: "K-02", label: "Active Riders", value: data?.activeRides || 0, delta: "+318", icon: UsersIcon },
                      { code: "K-03", label: "Live Drivers", value: data?.onlinePartners || 0, delta: "92%", icon: Car },
                      { code: "K-04", label: "Conversion", value: "68.9%", delta: "+2.1%", icon: TrendingUp },
                    ].map((k, i) => {
                      const Icon = k.icon;
                      return (
                        <motion.div
                          key={k.code}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="relative hairline bg-card p-5"
                        >
                          <Crosshairs />
                          <div className="flex items-center justify-between mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground">
                            <span>{k.code} · {k.label}</span>
                            <Icon className="h-3.5 w-3.5 text-signal" />
                          </div>
                          <div className="serif italic text-[44px] font-black leading-none tracking-tighter mt-4">{k.value}</div>
                          <div className="mt-3 flex items-center justify-between mono text-[10px] tracking-[0.22em] uppercase">
                            <span className="text-signal">▲ {k.delta}</span>
                            <span className="text-muted-foreground">vs 24H</span>
                          </div>
                          <div className="tick h-2 mt-3" />
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Events ledger + pulse */}
                  <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
                    <Panel code="LEDG / 11" title="Critical Events · Live Stream">
                      <div className="hidden md:grid hairline-b grid-cols-[60px_90px_1fr_140px_70px] gap-3 px-2 py-2 mono text-[9px] tracking-[0.22em] uppercase text-muted-foreground">
                        <span>Time</span><span>Code</span><span>Type</span><span>Region</span><span className="text-right">Sev</span>
                      </div>
                      {(eventsData?.logs || []).slice(0, 6).map((log: any, i: number) => {
                        const date = new Date(log.createdAt);
                        const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                        let code = "EV-" + log._id.toString().substring(log._id.toString().length - 4).toUpperCase();
                        let sev = "low";
                        if (log.severity === "critical" || log.severity === "error") sev = "high";
                        else if (log.severity === "warning") sev = "med";
                        let region = log.category.toUpperCase();
                        let type = log.action;
                        if (type.length > 20) type = type.substring(0, 20) + "...";
                        
                        return (
                        <motion.div
                          key={log._id}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="hairline-b grid grid-cols-[60px_90px_1fr_140px_70px] gap-3 px-2 py-3 items-center hover:bg-ink hover:text-bone transition-colors group"
                        >
                          <span className="mono text-[10px] text-muted-foreground group-hover:text-bone/60">{time}</span>
                          <span className="mono text-[10px] text-signal">{code}</span>
                          <span className="serif text-[15px] truncate">{type}</span>
                          <span className="mono text-[10px] tracking-[0.18em] uppercase truncate">{region}</span>
                          <span className="text-right">
                            <span className={`mono text-[9px] tracking-[0.22em] px-1.5 py-0.5 ${
                              sev === "high" ? "bg-signal text-bone" : sev === "med" ? "bg-ink text-bone group-hover:bg-bone group-hover:text-ink" : "hairline"
                            }`}>
                              {sev.toUpperCase()}
                            </span>
                          </span>
                        </motion.div>
                      )})}
                    </Panel>

                    <div className="space-y-5">
                      <Panel code="SYS / 12" title="System Pulse" accent="text-acid">
                        <div className="space-y-3">
                          {[
                            { label: "API Gateway", v: "42ms" },
                            { label: "Dispatch Engine", v: "11ms" },
                            { label: "Payments", v: "78ms" },
                            { label: "Realtime Sock", v: "8ms" },
                          ].map((s) => (
                            <div key={s.label} className="flex items-center justify-between hairline-b pb-2">
                              <span className="mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground flex items-center gap-2">
                                <CircleDot className="h-3 w-3 text-signal animate-blink" /> {s.label}
                              </span>
                              <span className="mono text-[11px]">{s.v}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 brick px-3 py-2 mono text-[10px] tracking-[0.22em] uppercase flex items-center justify-between">
                          <span><ActivityIcon className="h-3 w-3 inline mr-2" />ALL SYSTEMS OPERATIONAL</span>
                          <span className="text-signal animate-blink">●</span>
                        </div>
                      </Panel>

                      <Panel code="ACT / 13" title="Quick Strike">
                        <div className="grid grid-cols-1 gap-2">
                          {[
                            { l: "Trigger Surge", i: Zap },
                            { l: "Broadcast Alert", i: AlertTriangle },
                            { l: "Freeze Region", i: ShieldHalt },
                          ].map((b) => (
                            <button
                              key={b.l}
                              className="hairline px-3 py-2.5 mono text-[10px] tracking-[0.22em] uppercase hover:bg-ink hover:text-bone transition-colors flex items-center justify-between cursor-pointer"
                            >
                              <span className="flex items-center gap-2"><b.i className="h-3.5 w-3.5" />{b.l}</span>
                              <span>→</span>
                            </button>
                          ))}
                        </div>
                      </Panel>
                    </div>
                  </div>
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
