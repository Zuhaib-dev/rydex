"use client";

import { motion } from "motion/react";
import { ChevronRight, Video, Check } from "lucide-react";
import { useRouter } from "next/navigation";

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

const ContentList = ({ data, activeTab }: { data: DashboardData; activeTab: TabType }) => {
  const router = useRouter();

  const handleReviewClick = (id: string, type: TabType) => {
    if (type === "partner") {
      router.push(`/admin/reviews/partner/${id}`);
    }
    // and for vehicle / kyc as needed ...
  };

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
              <button 
                onClick={() => handleReviewClick(partner._id, "partner")}
                className="flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-xl text-xs font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg hover:shadow-black/5"
              >
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
}

export default ContentList;
