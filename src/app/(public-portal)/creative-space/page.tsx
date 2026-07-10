import type { Metadata } from "next";
import { listApprovedSpaces } from "@/app/actions/creative-spaces";
import { CreativeSpaceBrowseClient } from "./creative-space-client";

// Browse page is public + SEO-indexable. 5-min revalidate - organization
// space listings don't shift second-to-second.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "CIOS Organization Spaces - private portals for teams, cohorts, and partners",
  description:
    "Create or join organization spaces with staff portals, intern portals, lessons, assignments, chat, files, and super-admin governance.",
  openGraph: {
    title: "CIOS Organization Spaces",
    description: "Private organization portals for teams, cohorts, and partners on CIOS.",
    type: "website",
  },
  alternates: { canonical: "/creative-space" },
};

export default async function CreativeSpacePage() {
  const res = await listApprovedSpaces({ limit: 60 });
  return <CreativeSpaceBrowseClient spaces={res.ok ? res.data! : []} />;
}
