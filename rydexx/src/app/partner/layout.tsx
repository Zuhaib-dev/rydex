import PartnerLiveTracker from "@/components/partner/PartnerLiveTracker";
import PartnerDashboardLayout from "@/components/partner/PartnerDashboardLayout";

export default function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PartnerLiveTracker />
      <PartnerDashboardLayout>
        {children}
      </PartnerDashboardLayout>
    </>
  );
}
