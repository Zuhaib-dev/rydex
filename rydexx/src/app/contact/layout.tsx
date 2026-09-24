import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with Rydex for support, partnership inquiries, or general questions. We are here to help.",
  openGraph: {
    title: "Contact Us | Rydex",
    description: "Get in touch with Rydex for support, partnership inquiries, or general questions. We are here to help.",
    url: "https://rydexx.netlify.app/contact",
    siteName: "Rydex",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact Us | Rydex",
    description: "Get in touch with Rydex for support, partnership inquiries, or general questions. We are here to help.",
  },
  alternates: {
    canonical: "https://rydexx.netlify.app/contact",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "name": "Contact Rydex",
    "description": "Contact page for Rydex customer support and inquiries.",
    "url": "https://rydexx.netlify.app/contact",
    "mainEntity": {
      "@type": "Organization",
      "name": "Rydex",
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "customer support",
        "email": "support@rydexx.netlify.app"
      }
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
