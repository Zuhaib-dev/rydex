"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import { 
  Users, 
  CheckCircle, 
  Clock, 
  XCircle, 
  ChevronRight,
  ShieldCheck,
  Video,
  Truck,
  Check
} from "lucide-react";
import KPI from "./KPI";
import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";

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

const EmptyState = () => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="bg-white border border-gray-100 rounded-3xl p-16 flex flex-col items-center justify-center text-center space-y-4 shadow-sm"
  >
    <div className="w-16 h-16 rounded-2xl bg-green-50 text-green-500 flex items-center justify-center border border-green-100 shadow-inner">
      <Check size={32} strokeWidth={3} />
    </div>
    <div className="space-y-1">
      <h3 className="text-xl font-black text-gray-900 tracking-tight">All caught up!</h3>
      <p className="text-gray-400 text-sm font-medium">No pending items right now.</p>
    </div>
  </motion.div>
);

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

  const renderContent = () => {
    switch (activeTab) {
      case "partner":
        return data?.pendingPartnerReviews && data.pendingPartnerReviews.length > 0 ? (
          <div className="space-y-3">
            {data.pendingPartnerReviews.map((partner) => (
              <motion.div
                key={partner._id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white p-4 rounded-2xl border border-gray-100/50 shadow-sm flex items-center justify-between hover:border-gray-200 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-black text-lg border border-purple-100">
                    {partner.name[0].toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-base leading-tight">{partner.name}</h4>
                    <p className="text-gray-400 text-xs mt-0.5 tracking-tight">{partner.email}</p>
                  </div>
                </div>
                <button className="flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-xl text-xs font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg hover:shadow-black/5">
                  Review
                  <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
              </motion.div>
            ))}
          </div>
        ) : <EmptyState />;

      case "vehicle":
        return data?.pendingVehicleReviews && data.pendingVehicleReviews.length > 0 ? (
          <div className="space-y-3">
            {data.pendingVehicleReviews.map((vehicle) => (
              <motion.div
                key={vehicle._id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white p-4 rounded-2xl border border-gray-100/50 shadow-sm flex items-center justify-between hover:border-gray-200 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-lg border border-blue-100">
                    {vehicle.type[0].toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-base leading-tight">
                      {vehicle.vehicleModel} ({vehicle.vehicleNumber})
                    </h4>
                    <p className="text-gray-400 text-xs mt-0.5 tracking-tight">
                      Owner: {vehicle.owner?.name || "Unknown"}
                    </p>
                  </div>
                </div>
                <button className="flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-xl text-xs font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg hover:shadow-black/5">
                  Review
                  <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
              </motion.div>
            ))}
          </div>
        ) : <EmptyState />;

      case "kyc":
        return data?.pendingVideoKYC && data.pendingVideoKYC.length > 0 ? (
          <div className="space-y-3">
            {data.pendingVideoKYC.map((kyc) => (
              <motion.div
                key={kyc._id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white p-4 rounded-2xl border border-gray-100/50 shadow-sm flex items-center justify-between hover:border-gray-200 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black text-lg border border-amber-100">
                    {kyc.name[0].toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-base leading-tight">{kyc.name}</h4>
                    <p className="text-gray-400 text-xs mt-0.5 tracking-tight">KYC Verification Pending</p>
                  </div>
                </div>
                <button className="flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-xl text-xs font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg hover:shadow-black/5">
                  Call Now
                  <Video size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
              </motion.div>
            ))}
          </div>
        ) : <EmptyState />;

      default:
        return <EmptyState />;
    }
  };

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

        {/* Updated Status Tabs matching image */}
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

        {/* Content Section */}
        <section className="space-y-4 min-h-[400px]">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
              {activeTab === "partner" ? "Partner Reviews Queue" : activeTab === "kyc" ? "Video KYC Queue" : "Vehicle Reviews Queue"}
            </h2>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {activeTab === "partner" ? (data?.pendingPartnerReviews?.length || 0) : activeTab === "kyc" ? (data?.pendingVideoKYC?.length || 0) : (data?.pendingVehicleReviews?.length || 0)} items
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
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </section>
      </main>
    </div>
  );
}

export default AdminDashboard;
