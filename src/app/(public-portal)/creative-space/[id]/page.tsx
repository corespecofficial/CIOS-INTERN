import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSpace, getSpaceReviews } from "@/app/actions/creative-spaces";
import { creatorCredibility } from "@/lib/creator-credibility";
import { SpaceDetailClient } from "./space-detail-client";

export const dynamic = "force-dynamic";

const SITE = process.env.NEXT_PUBLIC_APP_URL || "https://cios-intern.vercel.app";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const res = await getSpace(id);
  if (!res.ok || !res.data) return { title: "Space not found · CIOS Creative Spaces" };
  const s = res.data;
  const priceLabel = s.price_per_student === 0 ? "Free" : `₦${Number(s.price_per_student).toLocaleString()}`;
  return {
    title: `${s.title} — ${priceLabel} · CIOS Creative Spaces`,
    description: s.description.slice(0, 160),
    alternates: { canonical: `/creative-space/${s.id}` },
    openGraph: {
      title: s.title,
      description: s.description.slice(0, 160),
      type: "website",
      url: `${SITE}/creative-space/${s.id}`,
      images: s.cover_image_url ? [{ url: s.cover_image_url }] : undefined,
    },
  };
}

export default async function SpaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // The route param can be either a UUID or a slug — getSpace handles
  // both. We must resolve the space FIRST and then look up reviews by
  // the canonical UUID, otherwise getSpaceReviews (slug-unaware) finds
  // nothing for slug-based URLs.
  const spaceRes = await getSpace(id);
  if (!spaceRes.ok || !spaceRes.data) return notFound();

  const s = spaceRes.data;
  const reviewsRes = await getSpaceReviews(s.id, 10);
  const reviews = reviewsRes.ok ? reviewsRes.data! : [];
  const cred = creatorCredibility({
    xp: s.owner_xp,
    level: s.owner_level,
    role: s.owner_role,
    percentile: s.owner_percentile,
  });

  // schema.org Course rich-result for Google
  const jsonLd = {
    "@context": "https://schema.org/",
    "@type": "Course",
    name: s.title,
    description: s.description,
    provider: { "@type": "Organization", name: "CIOS" },
    instructor: { "@type": "Person", name: s.owner_name || "CIOS Instructor" },
    ...(s.cover_image_url ? { image: s.cover_image_url } : {}),
    ...(s.rating > 0 && s.review_count > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: s.rating,
            ratingCount: s.review_count,
          },
        }
      : {}),
    offers: {
      "@type": "Offer",
      priceCurrency: "NGN",
      price: s.price_per_student,
      availability:
        s.enrollment_count < s.capacity ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
      url: `${SITE}/creative-space/${s.id}`,
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SpaceDetailClient
        space={s}
        reviews={reviews}
        credBadge={cred.badge}
        credTier={cred.tier}
        provenance={cred.provenance}
      />
    </>
  );
}
