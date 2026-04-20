import type { Metadata } from "next";
import { listProducts } from "@/app/actions/marketplace";
import { MarketplaceClient } from "./marketplace-client";

// Public, SEO-visible. Revalidate every 60s so new listings surface quickly
// without wrecking edge cache.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "CIOS Marketplace — digital products by Africa's top interns",
  description:
    "Buy templates, tools, e-books, courses, design kits and more — built by vetted CIOS interns, mentors and alumni. Support the creator; a slice funds the next cohort.",
  openGraph: {
    title: "CIOS Marketplace",
    description:
      "Digital products built by Africa's top interns and alumni. Browse free, tip what you want, or pay what you think it's worth.",
    type: "website",
  },
  alternates: { canonical: "/marketplace" },
};

export default async function MarketplacePage() {
  const res = await listProducts({ limit: 60 });
  return <MarketplaceClient products={res.ok ? res.data! : []} />;
}
