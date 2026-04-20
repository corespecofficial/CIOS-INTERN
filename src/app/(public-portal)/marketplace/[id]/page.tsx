import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduct } from "@/app/actions/marketplace";
import { ProductDetailClient } from "./product-detail-client";
import { creatorCredibility } from "@/lib/creator-credibility";

// Rendered fresh on each hit — rating/sales change; safe for SEO because the
// detail page is indexable and stable enough for crawlers.
export const dynamic = "force-dynamic";

const SITE = process.env.NEXT_PUBLIC_APP_URL || "https://cios-intern.vercel.app";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const res = await getProduct(id);
  if (!res.ok || !res.data) return { title: "Product not found · CIOS Marketplace" };
  const p = res.data;
  const priceLabel =
    p.price_ngn === 0 && p.pay_min_ngn == null ? "Free" :
    p.pay_min_ngn != null ? `From ₦${Number(p.pay_min_ngn).toLocaleString()}` :
    `₦${Number(p.price_ngn).toLocaleString()}`;
  const title = `${p.title} — ${priceLabel} · CIOS Marketplace`;
  const description = p.description.slice(0, 160);

  return {
    title,
    description,
    alternates: { canonical: `/marketplace/${p.id}` },
    openGraph: {
      title: p.title,
      description,
      type: "website",
      url: `${SITE}/marketplace/${p.id}`,
      images: p.cover_image_url ? [{ url: p.cover_image_url }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: p.title,
      description,
      images: p.cover_image_url ? [p.cover_image_url] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await getProduct(id);
  if (!res.ok || !res.data) return notFound();

  const p = res.data;
  const cred = creatorCredibility({
    xp: p.seller_xp,
    level: p.seller_level,
    role: p.seller_role,
    percentile: p.seller_percentile,
  });

  // JSON-LD schema.org/Product — boosts SEO rich snippets (price, seller, rating).
  const jsonLd = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: p.title,
    description: p.description,
    category: p.category,
    image: p.cover_image_url || undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: "NGN",
      price: p.price_ngn,
      availability: p.status === "active" ? "https://schema.org/InStock" : "https://schema.org/Discontinued",
      seller: { "@type": "Person", name: p.seller_name || "CIOS Creator" },
      url: `${SITE}/marketplace/${p.id}`,
    },
    ...(p.rating > 0 && p.sales_count > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: p.rating,
            ratingCount: p.sales_count,
          },
        }
      : {}),
    brand: { "@type": "Brand", name: "CIOS" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ProductDetailClient product={p} credBadge={cred.badge} credTier={cred.tier} provenance={cred.provenance} />
    </>
  );
}
