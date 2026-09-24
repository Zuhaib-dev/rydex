import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us | Rydex",
  description: "Learn about Rydex, the world's most premium multi-vehicle logistics aggregator. Discover our core pillars: safety, premium aesthetics, and reliability.",
  openGraph: {
    title: "About Us | Rydex",
    description: "Learn about Rydex, the world's most premium multi-vehicle logistics aggregator. Discover our core pillars: safety, premium aesthetics, and reliability.",
    url: "https://rydexx.netlify.app/about",
    siteName: "Rydex",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About Us | Rydex",
    description: "Learn about Rydex, the world's most premium multi-vehicle logistics aggregator. Discover our core pillars: safety, premium aesthetics, and reliability.",
  },
  alternates: {
    canonical: "https://rydexx.netlify.app/about",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "name": "About Rydex",
    "description": "Learn about Rydex, the world's most premium multi-vehicle logistics aggregator.",
    "url": "https://rydexx.netlify.app/about",
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
