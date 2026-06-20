import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Rydex",
  description: "Read the Rydex Terms of Service governing the use of our booking and fleet ecosystem.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
