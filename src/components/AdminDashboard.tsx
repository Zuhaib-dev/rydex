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
  Truck
} from "lucide-react";
import KPI from "./KPI";
import { motion } from "motion/react";
import Image from "next/image";

interface PartnerReview {
  _id: string;
  name: string;
  email: string;
  vehicleType?: string;
}

interface DashboardData {
  totalPartners: number;
  totalApprovedPartners: number;
  totalRejectedPartners: number;
  totalPendingPartners: number;
  pendingPartnerReviews: PartnerReview[];
}

function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

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
          <KPI 
            title="Total Partners" 
            value={data?.totalPartners || 0} 
            icon={<Users size={20} />} 
            iconBgColor="bg-purple-50" 
            iconColor="text-purple-500" 
          />
          <KPI 
            title="Approved Partners" 
            value={data?.totalApprovedPartners || 0} 
            icon={<CheckCircle size={20} />} 
            iconBgColor="bg-blue-50" 
            iconColor="text-blue-500" 
          />
          <KPI 
            title="Pending Partners" 
            value={data?.totalPendingPartners || 0} 
            icon={<Clock size={20} />} 
            iconBgColor="bg-amber-50" 
            iconColor="text-amber-500" 
          />
          <KPI 
            title="Rejected Partners" 
            value={data?.totalRejectedPartners || 0} 
            icon={<XCircle size={20} />} 
            iconBgColor="bg-red-50" 
            iconColor="text-red-500" 
          />
        </section>

        {/* Status Tabs */}
        <section className="bg-white p-2 rounded-2xl border border-gray-100/50 shadow-sm flex flex-col md:flex-row gap-2">
          <button className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl text-sm font-bold shadow-md transition-all">
            <Users size={16} />
            <span>Pending Partner Reviews</span>
            <span className="ml-2 w-5 h-5 bg-white text-black rounded-full text-[10px] flex items-center justify-center font-black">
              {data?.pendingPartnerReviews.length || 0}
            </span>
          </button>
          
          <button className="flex items-center gap-2 px-6 py-3 text-gray-400 hover:text-gray-900 rounded-xl text-sm font-bold transition-all">
            <Video size={16} />
            <span>Pending Video KYC</span>
            <span className="ml-2 w-5 h-5 bg-gray-100 text-gray-400 rounded-full text-[10px] flex items-center justify-center font-black">
              0
            </span>
          </button>

          <button className="flex items-center gap-2 px-6 py-3 text-gray-400 hover:text-gray-900 rounded-xl text-sm font-bold transition-all">
            <Truck size={16} />
            <span>Pending Vehicle Reviews</span>
            <span className="ml-2 w-5 h-5 bg-gray-100 text-gray-400 rounded-full text-[10px] flex items-center justify-center font-black">
              0
            </span>
          </button>
        </section>

        {/* Queue Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
              Partner Reviews Queue
            </h2>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {data?.pendingPartnerReviews.length || 0} items
            </span>
          </div>

          <div className="space-y-3">
            {data?.pendingPartnerReviews.map((partner) => (
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
                    <h4 className="font-bold text-gray-900 text-base leading-tight">
                      {partner.name}
                    </h4>
                    <p className="text-gray-400 text-xs mt-0.5 tracking-tight">
                      {partner.email}
                    </p>
                  </div>
                </div>
                <button className="flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-xl text-xs font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg hover:shadow-black/5 whitespace-nowrap">
                  Review
                  <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
              </motion.div>
            ))}

            {data?.pendingPartnerReviews.length === 0 && (
              <div className="bg-white/50 border border-dashed border-gray-200 rounded-3xl p-12 text-center">
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">
                  No pending reviews
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default AdminDashboard;
