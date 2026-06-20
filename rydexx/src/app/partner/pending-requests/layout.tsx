import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pending Requests | Rydex Partner",
  description: "View and accept incoming ride requests from Rydex customers.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
