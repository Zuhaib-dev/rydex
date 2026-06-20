import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us | Rydex",
  description: "Get in touch with Rydex for support, partnership inquiries, or general questions.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
