import { notFound } from "next/navigation";
import { getActiveOrg } from "@/lib/active-org";
import { TenantDataUnavailable } from "@/components/org/tenant-data-unavailable";

export const dynamic = "force-dynamic";

export default async function OrgRewardsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  if (!await getActiveOrg(orgSlug)) notFound();
  return <TenantDataUnavailable orgSlug={orgSlug} title="Organization rewards" description="No rewards have been issued in this organization. Rewards earned elsewhere are kept isolated and will not appear here." />;
}
