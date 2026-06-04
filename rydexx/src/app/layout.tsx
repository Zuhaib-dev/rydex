import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono, Syne } from "next/font/google";
import "./globals.css";
import Provider from "@/Provider";
import ReduxProvider from "@/redux/ReduxProvider";
import InitUser from "@/InitUser";
import InstallPWA from "@/components/InstallPWA";
import GlobalDynamicIsland from "@/components/ride/GlobalDynamicIsland";
import PartnerForceDispatchOverlay from "@/components/partner/PartnerForceDispatchOverlay";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const BASE_URL = "https://rydexx.netlify.app"; 

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Rydex — Book Your Ride in a Go",
    template: "%s | Rydex",
  },
  description:
    "Rydex lets you book bikes, cars, and trucks instantly. Fast, affordable, and reliable vehicle booking at your fingertips.",
  keywords: [
    "rydex",
    "vehicle booking",
    "rent a car",
    "bike rental",
    "truck rental",
    "ride booking app",
  ],
  authors: [{ name: "Zuhaib Rashid", url: "https://zuhaibrashid.com" }],
  creator: "Zuhaib Rashid",
  publisher: "Zuhaib Rashid",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Rydex",
    startupImage: "/apple-touch-icon.png",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: "website",
    url: BASE_URL,
    siteName: "Rydex",
    title: "Rydex — Book Your Ride in a Go",
    description:
      "Rydex lets you book bikes, cars, and trucks instantly. Fast, affordable, and reliable vehicle booking at your fingertips.",
    images: [
      {
        url: "/ogimage.png",
        width: 1200,
        height: 630,
        alt: "Rydex — Book Your Ride in a Go",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rydex — Book Your Ride in a Go",
    description:
      "Rydex lets you book bikes, cars, and trucks instantly. Fast, affordable, and reliable vehicle booking at your fingertips.",
    images: ["/ogimage.png"],
  },
  verification: {
    google: "PhC4G2XmPO_iZ5yQFaXvkOkJHHJEwRRJsjygMozyteA",
  },
  icons: {
    icon: [
      { url: "/icon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/icon-192x192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": "https://rydexx.netlify.app/#creator",
        "name": "Zuhaib Rashid",
        "url": "https://zuhaibrashid.com",
        "sameAs": [
          "https://zuhaibrashid.com",
          "https://github.com/Zuhaib-dev",
          "https://www.linkedin.com/in/zuhaib-rashid-661345318/",
          "https://x.com/xuhaib_x9"
        ]
      },
      {
        "@type": "Organization",
        "@id": "https://rydexx.netlify.app/#organization",
        "name": "Rydex",
        "url": "https://rydexx.netlify.app",
        "logo": "https://rydexx.netlify.app/logo.png",
        "founder": {
          "@id": "https://rydexx.netlify.app/#creator"
        },
        "sameAs": [
          "https://github.com/Zuhaib-dev",
          "https://www.linkedin.com/in/zuhaib-rashid-661345318/",
          "https://x.com/xuhaib_x9"
        ]
      },
      {
        "@type": "WebSite",
        "@id": "https://rydexx.netlify.app/#website",
        "url": "https://rydexx.netlify.app",
        "name": "Rydex",
        "description": "Rydex lets you book bikes, cars, and trucks instantly. Fast, affordable, and reliable vehicle booking at your fingertips.",
        "publisher": {
          "@id": "https://rydexx.netlify.app/#organization"
        },
        "author": {
          "@id": "https://rydexx.netlify.app/#creator"
        }
      },
      {
        "@type": "SoftwareApplication",
        "@id": "https://rydexx.netlify.app/#softwareapplication",
        "name": "Rydex App",
        "operatingSystem": "All",
        "applicationCategory": "TravelApplication",
        "author": {
          "@id": "https://rydexx.netlify.app/#creator"
        },
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "INR"
        }
      }
    ]
  };

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${syne.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* PWA Meta Tags */}
        <meta name="application-name" content="Rydex" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Rydex" />
        <meta name="theme-color" content="#0a0a0a" />
        <meta name="msapplication-TileColor" content="#0a0a0a" />
        <meta name="msapplication-TileImage" content="/icon-144x144.png" />
        <meta name="msapplication-tap-highlight" content="no" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="144x144" href="/icon-144x144.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icon-192x192.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "wyaed16hp3");`}
        </Script>
        <ReduxProvider>
          <Provider>
            <InitUser />
            <GlobalDynamicIsland />
            <PartnerForceDispatchOverlay />
            {children}
            <InstallPWA />
          </Provider>
        </ReduxProvider>
      </body>
    </html>
  );
}
