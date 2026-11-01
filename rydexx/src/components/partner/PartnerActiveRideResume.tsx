"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

/** Restore the operator's in-progress ride before showing a partner dashboard. */
export default function PartnerActiveRideResume() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [resolvedPath, setResolvedPath] = useState<string | null>(null);

  useEffect(() => {
    if (!pathname.startsWith("/partner") || pathname === "/partner/active-ride") return;
    if (status === "loading") return;
    if (status !== "authenticated" || session?.user?.role !== "partner") return;

    let cancelled = false;
    fetch("/api/partner/bookings/active", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((booking) => {
        if (!cancelled && booking?._id) {
          router.replace("/partner/active-ride");
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setResolvedPath(pathname);
      });

    return () => {
      cancelled = true;
    };
  }, [pathname, router, session?.user?.role, status]);

  const isPartnerDashboard = pathname.startsWith("/partner") && pathname !== "/partner/active-ride";
  const checking = isPartnerDashboard && (
    status === "loading" ||
    (status === "authenticated" && session?.user?.role === "partner" && resolvedPath !== pathname)
  );
  if (!checking) return null;

  return (
    <div className="fixed inset-0 z-[10000] grid place-items-center bg-zinc-950 text-white" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-emerald-400" />
        <span className="text-sm font-medium text-white/70">Checking for your active ride…</span>
      </div>
    </div>
  );
}
