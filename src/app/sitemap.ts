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
    // Public Creative Spaces (Phase 2)
    { path: "/creative-space", priority: 0.95, changeFrequency: "daily" },
    // Public Opportunities (Phase 3)
    { path: "/opportunities", priority: 0.95, changeFrequency: "daily" },
    // Public Hackathons (Phase 4)
    { path: "/hackathons", priority: 0.9, changeFrequency: "daily" },
    // Public Investors + Startups (Phase 5)
    { path: "/investors", priority: 0.9, changeFrequency: "daily" },
    { path: "/investor/onboarding", priority: 0.7, changeFrequency: "monthly" },
    // Public Tools Trilogy (Phase 6)
    { path: "/study-buddy", priority: 0.85, changeFrequency: "weekly" },
    { path: "/ai-hub",      priority: 0.85, changeFrequency: "weekly" },
    { path: "/documents",   priority: 0.85, changeFrequency: "weekly" },
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

    // Creative Spaces — mirror the marketplace pattern.
    const [csRes, csOwnersRes] = await Promise.all([
      sb.from("creative_spaces").select("id, updated_at").eq("status", "approved").limit(2000),
      sb.from("creative_spaces").select("owner_id").eq("status", "approved"),
    ]);
    const cs = (csRes.data || []) as Array<{ id: string; updated_at: string }>;
    const csOwners = Array.from(new Set(((csOwnersRes.data || []) as Array<{ owner_id: string }>).map((r) => r.owner_id)));
    const spaceEntries = cs.map((s) => ({
      url: `${SITE}/creative-space/${s.id}`,
      lastModified: new Date(s.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
    const instructorEntries = csOwners.map((id) => ({
      url: `${SITE}/creative-space/instructor/${id}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

    // Opportunities — detail + public recruiter profiles.
    const [oppRes, recRes] = await Promise.all([
      sb.from("opportunities").select("id, updated_at").eq("status", "open").limit(2000),
      sb.from("opportunities").select("recruiter_id").eq("status", "open"),
    ]);
    const opps = (oppRes.data || []) as Array<{ id: string; updated_at: string }>;
    const recIds = Array.from(new Set(((recRes.data || []) as Array<{ recruiter_id: string }>).map((r) => r.recruiter_id)));
    const oppEntries = opps.map((o) => ({
      url: `${SITE}/opportunities/${o.id}`,
      lastModified: new Date(o.updated_at),
      changeFrequency: "daily" as const,
      priority: 0.75,
    }));
    const recruiterEntries = recIds.map((id) => ({
      url: `${SITE}/opportunities/recruiter/${id}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

    // Hackathons — only non-cancelled events.
    const { data: hkRes } = await sb.from("hackathons").select("id, updated_at").neq("status", "cancelled").limit(2000);
    const hks = (hkRes || []) as Array<{ id: string; updated_at: string }>;
    const hkEntries = hks.map((h) => ({
      url: `${SITE}/hackathons/${h.id}`,
      lastModified: new Date(h.updated_at),
      changeFrequency: "daily" as const,
      priority: 0.7,
    }));

    // Startups — public pitches only.
    const { data: stRes } = await sb.from("startup_pitches").select("id, updated_at").eq("is_public", true).eq("status", "active").limit(2000);
    const starts = (stRes || []) as Array<{ id: string; updated_at: string }>;
    const startupEntries = starts.map((s) => ({
      url: `${SITE}/startups/${s.id}`,
      lastModified: new Date(s.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

    return [...base, ...productEntries, ...creatorEntries, ...spaceEntries, ...instructorEntries, ...oppEntries, ...recruiterEntries, ...hkEntries, ...startupEntries];
  } catch {
    return base;
  }
}
