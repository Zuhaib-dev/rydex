import { Metadata } from "next";

export const metadata: Metadata = {
  title: "QR Validator | Rydex Partner",
  description: "Validate customer boarding passes and QR codes for Rydex rides.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
