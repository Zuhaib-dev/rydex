import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import DeviceManagement from "@/components/DeviceManagement";

export const metadata = {
  title: "Security Settings | Rydex",
  description: "Manage your active devices and sessions",
};

export default function SecuritySettingsPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white relative py-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background glow effects for premium look */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-linear-to-b from-primary/10 via-transparent to-transparent pointer-events-none blur-3xl opacity-50" />
      <div className="absolute -top-40 left-1/3 w-[600px] h-[600px] bg-primary/5 rounded-full pointer-events-none blur-[120px] opacity-40" />

      <div className="max-w-3xl mx-auto space-y-8 relative z-10">
        
        {/* Back Link with Arrow Icon */}
        <div className="flex items-center gap-4">
          <Link 
            href="/" 
            className="flex items-center justify-center w-10 h-10 rounded-full border border-white/10 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-200 group"
            aria-label="Back to Home"
          >
            <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-0.5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-linear-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
              Security Settings
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Manage your active sessions and secure your account.
            </p>
          </div>
        </div>

        {/* Glassmorphic Container for Device Management */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.37)] backdrop-blur-xl">
          <DeviceManagement />
        </div>
      </div>
    </div>
  );
}
