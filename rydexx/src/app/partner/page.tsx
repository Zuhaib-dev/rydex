import PartnerDashboard from "@/components/PartnerDashboard";
import { auth } from "@/lib/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import { redirect } from "next/navigation";

export default async function PartnerPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  await connectDb();
  const user = await User.findOne({ email: session.user.email });

  if (user?.role !== "partner" && user?.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="w-full min-h-screen bg-[#fafafa]">
      <PartnerDashboard />
    </div>
  );
}
