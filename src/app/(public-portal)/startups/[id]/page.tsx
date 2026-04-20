import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicPitch } from "@/app/actions/startup";
import { creatorCredibility } from "@/lib/creator-credibility";
import { StartupDetailClient } from "./startup-detail-client";

export const dynamic = "force-dynamic";

const SITE = process.env.NEXT_PUBLIC_APP_URL || "https://cios-intern.vercel.app";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const res = await getPublicPitch(id);
  if (!res.ok || !res.data) return { title: "Startup not found · CIOS" };
  const p = res.data;
  return {
    title: `${p.startup_name} — ${p.tagline} · CIOS`,
    description: p.description.slice(0, 160),
    alternates: { canonical: `/startups/${p.id}` },
    openGraph: {
      title: p.startup_name,
      description: p.tagline,
      type: "website",
      url: `${SITE}/startups/${p.id}`,
      images: p.cover_image_url ? [{ url: p.cover_image_url }] : undefined,
    },
  };
}

export default async function StartupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await getPublicPitch(id);
  if (!res.ok || !res.data) return notFound();
  const p = res.data;
  const cred = creatorCredibility({
    xp: p.founder_xp ?? 0,
    level: p.founder_level ?? 1,
    role: p.founder_role ?? "intern",
    percentile: null,
  });

  // schema.org Organization JSON-LD for SEO rich results
  const jsonLd = {
    "@context": "https://schema.org/",
    "@type": "Organization",
    name: p.startup_name,
    description: p.tagline,
    url: p.website_url || `${SITE}/startups/${p.id}`,
    ...(p.cover_image_url ? { logo: p.cover_image_url } : {}),
    ...(p.country ? { address: { "@type": "PostalAddress", addressCountry: p.country } } : {}),
    foundingDate: p.founded_year ? `${p.founded_year}` : undefined,
    numberOfEmployees: p.team_size ?? undefined,
    founder: { "@type": "Person", name: p.founder_name || "CIOS Founder" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <StartupDetailClient
        pitch={p}
        credBadge={cred.badge}
        credTier={cred.tier}
        provenance={cred.provenance}
      />
    </>
  );
}
