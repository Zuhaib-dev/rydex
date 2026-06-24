import React, { Suspense } from "react";
import DeviceManagement from "@/components/DeviceManagement";
import { Loader2 } from "lucide-react";

export const metadata = {
  title: "Security Settings | Rydex",
  description: "Manage your active devices and sessions",
};

export default function SecuritySettingsPage() {
  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6">
      <Suspense fallback={
        <div className="p-8 text-center mono text-[11px] tracking-[0.2em] uppercase text-muted-foreground flex justify-center items-center h-48 border border-border bg-secondary/10">
          <Loader2 className="animate-spin w-4 h-4 mr-2" />
          Loading security module...
        </div>
      }>
        <DeviceManagement />
      </Suspense>
    </div>
  );
}
