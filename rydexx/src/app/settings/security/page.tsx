import React from "react";
import DeviceManagement from "@/components/DeviceManagement";

export const metadata = {
  title: "Security Settings | Rydex",
  description: "Manage your active devices and sessions",
};

export default function SecuritySettingsPage() {
  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6">
      <DeviceManagement />
    </div>
  );
}
