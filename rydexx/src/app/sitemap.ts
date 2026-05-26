import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://rydexx.netlify.app";
  
  // Publicly indexable SEO-boosting routes
  const routes = ["", "/about", "/fleet", "/faq", "/contact", "/privacy", "/terms"];
  
  return routes.map((route) => {
    let priority = 0.5;
    if (route === "") priority = 1.0;
    else if (route === "/about" || route === "/fleet") priority = 0.8;
    else if (route === "/faq" || route === "/contact") priority = 0.7;
    else priority = 0.3;

    return {
      url: `${baseUrl}${route}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority,
    };
  });
}
