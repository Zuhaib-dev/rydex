import AdminDashboard from "@/components/AdminDashboard";
import Footer from "@/components/Footer";
import Nav from "@/components/Nav";
import PartnerDashboard from "@/components/PartnerDashboard";
import PublicHome from "@/components/PublicHome";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();
  return (
    <div className="w-full min-h-screen bg-white ">
      <Nav />
      {session?.user?.role == "partner" ? (
        <PartnerDashboard />
      ) : session?.user?.role == "admin" ? (
        <AdminDashboard />
      ) : (
        <PublicHome />
      )}
      <Footer />
    </div>
  );
}
