import AdminLiveMap from "@/components/AdminLiveMap";
import { AdminRealtimeProvider } from "@/hooks/useAdminRealtime";
import { auth } from "@/lib/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import { redirect } from "next/navigation";

export default async function ControlTowerPage() {
  const session = await auth();
  
  if (!session?.user?.email) {
    redirect("/auth/signin");
  }

  await connectDb();
  const user = await User.findOne({ email: session.user.email });

  if (user?.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="w-full h-screen bg-black overflow-hidden relative">
      <AdminRealtimeProvider>
        <AdminLiveMap isFullScreen={true} />
      </AdminRealtimeProvider>
    </div>
  );
}
