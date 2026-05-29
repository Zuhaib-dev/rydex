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
} from "lucide-react";
import KPI from "./KPI";
import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";
import ContentList from "./ContentList";
import AdminEarningsChart from "./AdminEarning";
import AdminLiveMap from "./AdminLiveMap";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/redux/store";
import { setUserData } from "@/redux/userSlice";
import {
  AdminRealtimeProvider,
  useAdminRealtime,
} from "@/hooks/useAdminRealtime";
import { useAdminDashboardData } from "@/hooks/useAdminDashboardData";
import AdminLiveIndicator from "./admin/AdminLiveIndicator";

type TabType = "partner" | "kyc" | "vehicle" | "map";

function AdminDashboardContent() {
  const [activeTab, setActiveTab] = useState<TabType>("partner");
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { userData } = useSelector((state: RootState) => state.user);
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

  const getItemsCount = (tab: TabType) => {
    switch (tab) {
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

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-black" />
        <p className="text-sm font-medium text-gray-500">Loading control tower…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Rydex"
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
            />
            <span className="font-black text-xl uppercase tracking-tighter">
              Rydex
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
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
                    className="absolute right-0 top-14 w-[330px] overflow-hidden rounded-2xl border border-black/10 bg-white text-black shadow-[0_24px_80px_rgba(0,0,0,0.18)]"
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

      <main className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6">
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

        <section className="flex flex-col gap-2 overflow-x-auto rounded-2xl border border-gray-100/50 bg-white p-2 shadow-sm md:flex-row">
          {(
            [
              { id: "partner" as const, label: "Pending Partner Reviews", icon: Users },
              { id: "kyc" as const, label: "Pending Video KYC", icon: Video },
              { id: "vehicle" as const, label: "Pending Vehicle Reviews", icon: Truck },
              { id: "map" as const, label: "Control Tower Map", icon: MapPin },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-6 py-3 text-sm font-bold transition-all ${
                activeTab === id
                  ? "bg-black text-white shadow-md"
                  : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
              }`}
            >
              <Icon size={16} />
              <span>{label}</span>
              {id !== "map" && (
                <span
                  className={`ml-2 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${
                    activeTab === id
                      ? "bg-red-500 text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {getItemsCount(id)}
                </span>
              )}
            </button>
          ))}
        </section>

        <section className="min-h-[400px] space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
              {activeTab === "partner"
                ? "Partner Reviews Queue"
                : activeTab === "kyc"
                  ? "Video KYC Queue"
                  : activeTab === "map"
                    ? "Control Tower Map"
                    : "Vehicle Reviews Queue"}
            </h2>
            {activeTab !== "map" && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                {getItemsCount(activeTab)} items
              </span>
            )}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "map" ? (
                <AdminLiveMap />
              ) : (
                data && <ContentList data={data} activeTab={activeTab} />
              )}
            </motion.div>
          </AnimatePresence>
        </section>
      </main>
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
