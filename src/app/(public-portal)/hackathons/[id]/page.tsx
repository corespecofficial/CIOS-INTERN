import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { getHackathon, getHackathonTeams, getLeaderboard } from "@/app/actions/hackathons";
import { HackathonDetailWrapper } from "./hackathon-detail-wrapper";

export const dynamic = "force-dynamic";
const SITE = process.env.NEXT_PUBLIC_APP_URL || "https://cios-intern.vercel.app";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const res = await getHackathon(id);
  if (!res.ok || !res.data) return { title: "Hackathon not found · CIOS" };
  const h = res.data;
  const description = (h.hero_blurb || h.description).slice(0, 160);
  return {
    title: `${h.title} · CIOS Hackathons`,
    description,
    alternates: { canonical: `/hackathons/${h.id}` },
    openGraph: {
      title: h.title,
      description,
      type: "website",
      url: `${SITE}/hackathons/${h.id}`,
      images: h.cover_image_url || h.banner_url ? [{ url: (h.cover_image_url || h.banner_url) as string }] : undefined,
    },
  };
}

export default async function HackathonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [hRes, me] = await Promise.all([getHackathon(id), getCurrentDbUser()]);
  if (!hRes.ok || !hRes.data) return notFound();

  // Authed users get teams + leaderboard. Anonymous visitors get nothing
  // (the detail page renders a ConversionGate around participation).
  const [teamsRes, lbRes] = me
    ? await Promise.all([getHackathonTeams(id), getLeaderboard(id)])
    : [{ ok: true as const, data: [] }, { ok: true as const, data: [] }];

  const h = hRes.data;
  const jsonLd = {
    "@context": "https://schema.org/",
    "@type": "Event",
    name: h.title,
    description: h.description,
    startDate: h.starts_at,
    endDate: h.ends_at,
    eventStatus: h.status === "cancelled"
      ? "https://schema.org/EventCancelled"
      : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    location: { "@type": "VirtualLocation", url: `${SITE}/hackathons/${h.id}` },
    organizer: { "@type": "Organization", name: "CIOS" },
    image: h.cover_image_url || h.banner_url || undefined,
    offers: h.prize_pool ? {
      "@type": "Offer",
      url: `${SITE}/hackathons/${h.id}`,
      availability: "https://schema.org/InStock",
      priceCurrency: "NGN",
      price: 0,
      validFrom: h.starts_at,
    } : undefined,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <HackathonDetailWrapper
        hackathon={h}
        teams={teamsRes.ok ? teamsRes.data : []}
        leaderboard={lbRes.ok ? lbRes.data : []}
        isAnon={!me}
        userId={me?.id ?? null}
      />
    </>
  );
}
