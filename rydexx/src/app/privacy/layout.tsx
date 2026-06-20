import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Rydex",
  description: "Read the Rydex Privacy Policy to understand how we protect your data and privacy.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
