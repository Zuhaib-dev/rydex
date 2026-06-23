import AdminDashboard from "@/components/AdminDashboard";

import GeoUpdater from "@/components/GeoUpdater";
import FaceLiftLanding from "@/components/landing/FaceLiftLanding";
import { auth } from "@/lib/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rydex - The Real-Time Booking Ecosystem",
  description: "Join Rydex, the most advanced platform for booking rides, fleet management, and real-time vehicle tracking.",
};

export default async function Home() {
  const session = await auth();
  await connectDb();
  const user = await User.findOne({ email: session?.user?.email });
  if (user?.role === "partner") {
    redirect("/partner");
  }

  const shouldTrackLocation = false; // We only track location in the new partner layout now.

  return (
    <div className="w-full min-h-screen bg-[#fafafa]">
      {shouldTrackLocation && <GeoUpdater userId={session?.user?.id} />}

      {user?.role === "admin" ? (
        <>
          <AdminDashboard />
        </>
      ) : (
        <FaceLiftLanding />
      )}
    </div>
  );
}
