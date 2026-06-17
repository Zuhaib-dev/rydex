import React from "react";
import DeviceManagement from "@/components/DeviceManagement";

export const metadata = {
  title: "Security Settings | Rydex",
  description: "Manage your active devices and sessions",
};

export default function SecuritySettingsPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Security Settings</h1>
          <p className="text-gray-400">
            View and manage where you're currently logged in.
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-xl">
          <DeviceManagement />
        </div>
      </div>
    </div>
  );
}
