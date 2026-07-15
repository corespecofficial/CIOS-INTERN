import { redirect } from "next/navigation";
import { getAccountabilityDashboard } from "@/app/actions/org-performance-discipline";
import { AccountabilityWorkspace } from "@/components/org-operations/accountability-workspace";

export const dynamic = "force-dynamic";

export default async function PerformancePage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const result = await getAccountabilityDashboard(orgSlug);
  if (!result.ok) redirect(`/s/${orgSlug}`);
  return <div style={{ maxWidth: 1180 }}><h1 style={{ margin: "0 0 4px", fontSize: 26 }}>My Performance</h1><p style={{ color: "#8892A4", marginTop: 0 }}>Your published scorecards, formal notices and right to respond.</p><AccountabilityWorkspace orgSlug={orgSlug} {...result.data} /></div>;
}
