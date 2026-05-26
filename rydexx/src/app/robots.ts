import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://rydexx.netlify.app";

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/about", "/fleet", "/faq", "/contact", "/privacy", "/terms"],
      disallow: [
        "/api/",
        "/admin/",
        "/bookings",
        "/partner/",
        "/user/",
        "/checkout/",
        "/video-kyc/",
        "/ride/",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
