import PartnerLiveTracker from "@/components/partner/PartnerLiveTracker";

export default function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PartnerLiveTracker />
      {children}
    </>
  );
}
