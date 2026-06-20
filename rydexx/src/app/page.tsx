import AdminDashboard from "@/components/AdminDashboard";
import Footer from "@/components/Footer";
import GeoUpdater from "@/components/GeoUpdater";
import Nav from "@/components/Nav";
import PartnerDashboard from "@/components/PartnerDashboard";
import PublicHome from "@/components/PublicHome";
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
  const shouldTrackLocation = Boolean(session?.user?.id && user?.role === "partner");

  // Partners can access the landing page manually if they choose to.

  return (
    <div className="w-full min-h-screen bg-[#fafafa]">
      {shouldTrackLocation && <GeoUpdater userId={session?.user?.id} />}

      {user?.role == "admin" ? (
        <AdminDashboard />
      ) : (
        <>
          <Nav />
          <PublicHome />
        </>
      )}
      <Footer />
    </div>
  );
}
