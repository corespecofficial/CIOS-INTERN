import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_APP_URL || "https://cios.cospronos.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }> = [
    { path: "/", priority: 1.0, changeFrequency: "weekly" },
    { path: "/about", priority: 0.8, changeFrequency: "monthly" },
    { path: "/pricing", priority: 0.9, changeFrequency: "weekly" },
    { path: "/contact", priority: 0.7, changeFrequency: "monthly" },
    { path: "/recruiters", priority: 0.85, changeFrequency: "weekly" },
    { path: "/talent-showcase", priority: 0.85, changeFrequency: "weekly" },
    { path: "/terms", priority: 0.4, changeFrequency: "yearly" },
    { path: "/verify", priority: 0.5, changeFrequency: "monthly" },
    { path: "/sign-in", priority: 0.6, changeFrequency: "yearly" },
    { path: "/sign-up", priority: 0.7, changeFrequency: "yearly" },
  ];
  return routes.map((r) => ({
    url: `${SITE}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
