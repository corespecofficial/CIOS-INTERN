import { notFound } from "next/navigation";
import { getActiveOrg } from "@/lib/active-org";
import { ComingSoon } from "../_coming-soon";

export const dynamic = "force-dynamic";

export default async function FilesPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  if (!(await getActiveOrg(orgSlug))) notFound();
  return <ComingSoon title="Files" description="Org-scoped uploads. Storage keys are prefixed orgs/<orgId>/ for tenant isolation." />;
}
