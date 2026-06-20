import { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Bookings | Rydex",
  description: "View and manage your past and upcoming ride bookings with Rydex.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
