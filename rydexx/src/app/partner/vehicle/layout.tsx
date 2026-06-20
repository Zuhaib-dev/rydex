import { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Vehicles | Rydex Partner",
  description: "Manage your active vehicles and fleet details on Rydex.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
