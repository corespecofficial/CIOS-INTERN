import { redirect } from "next/navigation";
import { getOrgContextOr404, requireOrgRole } from "@/lib/active-org";

export const dynamic = "force-dynamic";
const STAFF = ["owner", "org_admin", "instructor", "moderator", "finance", "support", "mentor"] as const;

/**
 * Compatibility router for old org-admin bookmarks. The former catch-all
 * rendered one generic dashboard for every module, which made unrelated
 * sidebar pages appear duplicated. Every legacy URL now lands on a real,
 * tenant-scoped workspace that uses the shared CIOS visual system.
 */
export default async function LegacyOrgAdminRoute({ params }: { params: Promise<{ orgSlug: string; adminPath?: string[] }> }) {
  const { orgSlug, adminPath = [] } = await params;
  const ctx = await getOrgContextOr404(orgSlug);
  requireOrgRole(ctx, STAFF);
  const key = adminPath.join("/");
  const destinations: Record<string, string> = {
    "": `/o/${orgSlug}`,
    users: `/o/${orgSlug}/members`,
    mentors: `/o/${orgSlug}/members`,
    alumni: `/o/${orgSlug}/members`,
    "company-docs": `/o/${orgSlug}/files`,
    finance: `/o/${orgSlug}/analytics#finance`,
    withdrawals: `/o/${orgSlug}/analytics#finance`,
    "audit-logs": `/o/${orgSlug}/audit`,
    "activity-monitor": `/o/${orgSlug}/analytics`,
    "compliance-reports": `/o/${orgSlug}/analytics#reports`,
    "contact-allocation": `/o/${orgSlug}/growth`,
    projects: `/o/${orgSlug}/assignments`,
    "creative-spaces": `/o/${orgSlug}/settings`,
    "note-templates": `/o/${orgSlug}/lessons`,
    engagement: `/o/${orgSlug}/analytics`,
    hackathons: `/o/${orgSlug}/assignments`,
    compliance: `/o/${orgSlug}/audit#compliance`,
    appeals: `/o/${orgSlug}/audit#compliance`,
    wellness: `/o/${orgSlug}/members#support`,
    "message-control": `/o/${orgSlug}/chat#moderation`,
    "security-center": `/o/${orgSlug}/audit#compliance`,
    observability: `/o/${orgSlug}/analytics`,
  };
  redirect(destinations[key] ?? `/o/${orgSlug}`);
}
