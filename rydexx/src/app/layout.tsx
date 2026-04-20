import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Provider from "@/Provider";
import ReduxProvider from "@/redux/ReduxProvider";
import InitUser from "@/InitUser";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
  authors: [{ name: "Rydex" }],
  creator: "Rydex",
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
        url: "/ogimage.webp",
        width: 1200,
        height: 630,
        alt: "Rydex — Book Your Ride",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rydex — Book Your Ride in a Go",
    description:
      "Rydex lets you book bikes, cars, and trucks instantly. Fast, affordable, and reliable vehicle booking at your fingertips.",
    images: ["/heroImage.jpg"],
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body>
        <ReduxProvider>
          <Provider>
            <InitUser />
          {children}
          </Provider>
        </ReduxProvider>
      </body>
    </html>
  );
}
