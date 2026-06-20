import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Active Ride | Rydex Partner",
  description: "Manage your currently active ride and navigate to the customer destination.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
