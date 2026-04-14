import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_APP_URL || "https://cios-intern.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/dashboard", "/admin", "/super-admin", "/messages", "/wallet", "/api", "/sign-in", "/sign-up", "/onboarding"] },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
