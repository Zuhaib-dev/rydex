import PartnerLiveTracker from "@/components/partner/PartnerLiveTracker";
import PartnerActiveRideResume from "@/components/partner/PartnerActiveRideResume";
import PartnerDashboardLayout from "@/components/partner/PartnerDashboardLayout";

export default function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PartnerLiveTracker />
      <PartnerActiveRideResume />
      <PartnerDashboardLayout>
        {children}
      </PartnerDashboardLayout>
    </>
  );
}
