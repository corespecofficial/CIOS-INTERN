import { getPublicCompanyDocs } from "@/app/actions/company-library";
import ResourcesClient from "./resources-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Resources — CPS Intern",
  description: "Pitch decks, platform blueprints, competitive analysis, and product specs. The strategic documents behind CPS Intern.",
  openGraph: {
    title: "CPS Intern — Resources & Company Library",
    description: "Investor-ready documents and product blueprints.",
    type: "website",
  },
};

export default async function ResourcesPage() {
  const res = await getPublicCompanyDocs();
  const docs = res.ok ? (res.data ?? []) : [];
  return <ResourcesClient docs={docs} />;
}
