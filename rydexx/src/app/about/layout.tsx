import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us | Rydex",
  description: "Learn more about Rydex, our mission, and the team behind the real-time booking ecosystem.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
