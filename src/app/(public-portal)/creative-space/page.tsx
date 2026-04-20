import type { Metadata } from "next";
import { listApprovedSpaces } from "@/app/actions/creative-spaces";
import { CreativeSpaceBrowseClient } from "./creative-space-client";

// Browse page is public + SEO-indexable. 5-min revalidate — course listings
// don't shift second-to-second.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "CIOS Creative Spaces — cohort-based courses by vetted Africa-based instructors",
  description:
    "Live and recorded courses in web dev, design, marketing, AI, data, and more — taught by ranked CIOS instructors. Cohort-based so you actually finish. Enrol free or pay-per-course.",
  openGraph: {
    title: "CIOS Creative Spaces",
    description: "Cohort-based courses by vetted Africa-based instructors. Enrol free or pay-per-course.",
    type: "website",
  },
  alternates: { canonical: "/creative-space" },
};

export default async function CreativeSpacePage() {
  const res = await listApprovedSpaces({ limit: 60 });
  return <CreativeSpaceBrowseClient spaces={res.ok ? res.data! : []} />;
}
