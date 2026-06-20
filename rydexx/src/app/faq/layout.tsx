import { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ | Rydex",
  description: "Find answers to frequently asked questions about Rydex bookings, fleet management, and partner programs.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
