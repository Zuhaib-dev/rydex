import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Partner Analytics | Rydex Partner",
  description: "Track your earnings, ratings, and performance metrics on Rydex.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
