import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Our Fleet | Rydex",
  description: "Explore the Rydex fleet of vehicles available for booking, from bikes to luxury cars and trucks.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
