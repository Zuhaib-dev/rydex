import AdminDashboard from "@/components/AdminDashboard";
import Footer from "@/components/Footer";
import GeoUpdater from "@/components/GeoUpdater";
import Nav from "@/components/Nav";
import PartnerDashboard from "@/components/PartnerDashboard";
import PublicHome from "@/components/PublicHome";
import { auth } from "@/lib/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";

export default async function Home() {
  const session = await auth();
  await connectDb();
  const user = await User.findOne({ email: session?.user?.email });
  return (
    <div className="w-full min-h-screen bg-white ">
 <GeoUpdater userId={session?.user?.id}/>

      {user?.role == "partner" ? (
        <>
          <Nav />

          <PartnerDashboard />
        </>
      ) : user?.role == "admin" ? (
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
