import type { MetadataRoute } from "next";
import { supabaseAdmin } from "@/lib/db";

const SITE = process.env.NEXT_PUBLIC_APP_URL || "https://cios-intern.vercel.app";

// Revalidate hourly so new marketplace products enter the sitemap promptly
// without rebuilding every request (sitemap reads the DB).
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }> = [
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
    // Public Marketplace (Phase 1)
    { path: "/marketplace", priority: 0.95, changeFrequency: "daily" },
  ];

  const base = staticRoutes.map((r) => ({
    url: `${SITE}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  // Append active marketplace products + creators. Swallow errors — sitemap
  // should degrade gracefully if the DB is unreachable.
  try {
    const sb = supabaseAdmin();
    const [productsRes, sellersRes] = await Promise.all([
      sb.from("marketplace_products").select("id, updated_at").eq("status", "active").limit(2000),
      sb.from("marketplace_products").select("seller_id").eq("status", "active"),
    ]);
    const products = (productsRes.data || []) as Array<{ id: string; updated_at: string }>;
    const sellerIds = Array.from(new Set(((sellersRes.data || []) as Array<{ seller_id: string }>).map((r) => r.seller_id)));

    const productEntries = products.map((p) => ({
      url: `${SITE}/marketplace/${p.id}`,
      lastModified: new Date(p.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
    const creatorEntries = sellerIds.map((id) => ({
      url: `${SITE}/marketplace/creator/${id}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
    return [...base, ...productEntries, ...creatorEntries];
  } catch {
    return base;
  }
}
