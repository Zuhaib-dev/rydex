"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import { 
  Users, 
  CheckCircle, 
  Clock, 
  XCircle, 
  ShieldCheck,
  Video,
  Truck
} from "lucide-react";
import KPI from "./KPI";
import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";
import ContentList from "./ContentList";
import AdminEarningsChart from "./AdminEarning";

type TabType = "partner" | "kyc" | "vehicle";

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
  pendingVideoKYC: any[];
}

function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("partner");

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
  const handleGetPendingKyc = async () => {
    try {
      const response = await axios.get("/api/admin/video-kyc/pending");
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
            <Image src="/logo.png" alt="Rydex" width={32} height={32} />
            <span className="font-black text-xl tracking-tighter uppercase">Rydex</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full text-xs font-bold uppercase tracking-widest shadow-lg">
            <ShieldCheck size={14} className="text-white" />
            Admin Dashboard
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
        </section>

        {/* Content Area using ContentList */}
        <section className="space-y-4 min-h-[400px]">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
              {activeTab === "partner" ? "Partner Reviews Queue" : activeTab === "kyc" ? "Video KYC Queue" : "Vehicle Reviews Queue"}
            </h2>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {getItemsCount(activeTab)} items
            </span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {data && <ContentList data={data} activeTab={activeTab} />}
            </motion.div>
          </AnimatePresence>
        </section>
      </main>
    </div>
  );
}

export default AdminDashboard;
