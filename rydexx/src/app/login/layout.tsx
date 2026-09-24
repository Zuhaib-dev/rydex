import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to your Rydex account to manage your rides, wallet, and profile. Secure and fast access.",
  openGraph: {
    title: "Login | Rydex",
    description: "Sign in to your Rydex account to manage your rides, wallet, and profile. Secure and fast access.",
    url: "https://rydexx.netlify.app/login",
    siteName: "Rydex",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Login | Rydex",
    description: "Sign in to your Rydex account to manage your rides, wallet, and profile. Secure and fast access.",
  },
  alternates: {
    canonical: "https://rydexx.netlify.app/login",
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
