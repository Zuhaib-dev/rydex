import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Partner Bookings | Rydex Partner",
  description: "View your completed, cancelled, and past ride bookings as a Rydex Partner.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
