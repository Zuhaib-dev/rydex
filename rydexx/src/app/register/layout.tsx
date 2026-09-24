import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Join Rydex today. Create an account to easily book bikes, cars, and trucks. Fast, reliable, and affordable rides.",
  openGraph: {
    title: "Create Account | Rydex",
    description: "Join Rydex today. Create an account to easily book bikes, cars, and trucks. Fast, reliable, and affordable rides.",
    url: "https://rydexx.netlify.app/register",
    siteName: "Rydex",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Create Account | Rydex",
    description: "Join Rydex today. Create an account to easily book bikes, cars, and trucks. Fast, reliable, and affordable rides.",
  },
  alternates: {
    canonical: "https://rydexx.netlify.app/register",
  },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Create Account | Rydex",
    "description": "Join Rydex today. Create an account to easily book bikes, cars, and trucks. Fast, reliable, and affordable rides.",
    "url": "https://rydexx.netlify.app/register",
    "publisher": {
      "@type": "Organization",
      "name": "Rydex",
      "logo": "https://rydexx.netlify.app/icon-192x192.png"
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
