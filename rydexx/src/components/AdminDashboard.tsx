"use client";

import axios from "axios";
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
  MapPin
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

type TabType = "partner" | "kyc" | "vehicle" | "map";

interface PartnerReview {
  _id: string;
  name: string;
  email: string;
  vehicleType?: string;
}

interface VehicleReview {
  _id: string;
  vehicleModel: string;
  vehicleNumber: string;
  type: string;
  owner?: {
    name: string;
    email: string;
  };
}

interface DashboardData {
  totalPartners: number;
  totalApprovedPartners: number;
  totalRejectedPartners: number;
  totalPendingPartners: number;
  pendingPartnerReviews: PartnerReview[];
  pendingVehicleReviews: VehicleReview[];
  pendingVideoKYC: PartnerReview[];
}

function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("partner");
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { userData } = useSelector((state: RootState) => state.user);

  const profileName = userData?.name || session?.user?.name || "Admin";
  const profileEmail = userData?.email || session?.user?.email || "Email not available";
  const profileRole = userData?.role || session?.user?.role || "admin";
  const profileImage = userData?.image || session?.user?.image || null;

  const handleGetData = async () => {
    try {
      const response = await axios.get("/api/admin/dashboard");
      setData(response.data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleGetData();
  }, []);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  const getItemsCount = (tab: TabType) => {
    switch(tab) {
      case "partner": return data?.pendingPartnerReviews?.length || 0;
      case "kyc": return data?.pendingVideoKYC?.length || 0;
      case "vehicle": return data?.pendingVehicleReviews?.length || 0;
      default: return 0;
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Rydex" width={32} height={32} className="h-8 w-8 object-contain" />
            <span className="font-black text-xl tracking-tighter uppercase">Rydex</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full text-xs font-bold uppercase tracking-widest shadow-lg">
              <ShieldCheck size={14} className="text-white" />
              Admin Dashboard
            </div>

            <div className="relative" ref={profileRef}>
              <button
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
                          <p className="mt-1 truncate text-sm text-white/60">{profileEmail}</p>
                          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-black">
                            <ShieldCheck size={12} />
                            {profileRole}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 px-5 py-4">
                      <AdminProfileDetail icon={<Mail size={16} />} label="Email" value={profileEmail} />
                      <AdminProfileDetail icon={<ShieldCheck size={16} />} label="Access level" value={profileRole} />
                    </div>

                    <div className="border-t border-gray-100 px-3 py-3">
                      <button
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        {/* KPI Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPI title="Total Partners" value={data?.totalPartners || 0} icon={<Users size={20} />} iconBgColor="bg-purple-50" iconColor="text-purple-500" />
          <KPI title="Approved Partners" value={data?.totalApprovedPartners || 0} icon={<CheckCircle size={20} />} iconBgColor="bg-blue-50" iconColor="text-blue-500" />
          <KPI title="Pending Partners" value={data?.totalPendingPartners || 0} icon={<Clock size={20} />} iconBgColor="bg-amber-50" iconColor="text-amber-500" />
          <KPI title="Rejected Partners" value={data?.totalRejectedPartners || 0} icon={<XCircle size={20} />} iconBgColor="bg-red-50" iconColor="text-red-500" />
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)] gap-6 items-stretch">
          <AdminEarningsChart />
          <div className="bg-black text-white rounded-[28px] p-6 shadow-[0_14px_40px_rgba(0,0,0,0.18)] flex flex-col justify-between min-h-[360px]">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-5">
                <ShieldCheck size={22} />
              </div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/50 font-black mb-2">
                Control Center
              </p>
              <h2 className="text-3xl font-black tracking-tight leading-tight">
                Reviews, KYC, and revenue in one place.
              </h2>
              <p className="text-sm text-white/60 leading-relaxed mt-4">
                Monitor platform commission while clearing partner and vehicle approval queues.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 pt-8">
              {[
                ["Partner", data?.pendingPartnerReviews?.length || 0],
                ["KYC", data?.pendingVideoKYC?.length || 0],
                ["Vehicle", data?.pendingVehicleReviews?.length || 0],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-white/10 px-4 py-3">
                  <p className="text-2xl font-black">{value}</p>
                  <p className="text-[10px] uppercase tracking-widest text-white/45 font-bold mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tab Buttons */}
        <section className="bg-white p-2 rounded-2xl border border-gray-100/50 shadow-sm flex flex-col md:flex-row gap-2 overflow-x-auto">
          <button 
            onClick={() => setActiveTab("partner")}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === "partner" ? "bg-black text-white shadow-md" : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
            }`}
          >
            <Users size={16} />
            <span>Pending Partner Reviews</span>
            <span className={`ml-2 w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-black ${
              activeTab === "partner" ? "bg-red-500 text-white" : "bg-gray-100 text-gray-400"
            }`}>
              {data?.pendingPartnerReviews?.length || 0}
            </span>
          </button>
          
          <button 
            onClick={() => setActiveTab("kyc")}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === "kyc" ? "bg-black text-white shadow-md" : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
            }`}
          >
            <Video size={16} />
            <span>Pending Video KYC</span>
            <span className={`ml-2 w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-black ${
              activeTab === "kyc" ? "bg-red-500 text-white" : "bg-gray-100 text-gray-400"
            }`}>
              {data?.pendingVideoKYC?.length || 0}
            </span>
          </button>

          <button 
            onClick={() => setActiveTab("vehicle")}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === "vehicle" ? "bg-black text-white shadow-md" : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
            }`}
          >
            <Truck size={16} />
            <span>Pending Vehicle Reviews</span>
            <span className={`ml-2 w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-black ${
              activeTab === "vehicle" ? "bg-red-500 text-white" : "bg-gray-100 text-gray-400"
            }`}>
              {data?.pendingVehicleReviews?.length || 0}
            </span>
          </button>

          <button 
            onClick={() => setActiveTab("map")}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === "map" ? "bg-black text-white shadow-md" : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
            }`}
          >
            <MapPin size={16} />
            <span>Control Tower Map</span>
          </button>
        </section>

        {/* Content Area using ContentList */}
        <section className="space-y-4 min-h-[400px]">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
              {activeTab === "partner" ? "Partner Reviews Queue" : activeTab === "kyc" ? "Video KYC Queue" : activeTab === "map" ? "Control Tower Map" : "Vehicle Reviews Queue"}
            </h2>
            {activeTab !== "map" && (
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
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
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
        <p className="truncate text-sm font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

export default AdminDashboard;
