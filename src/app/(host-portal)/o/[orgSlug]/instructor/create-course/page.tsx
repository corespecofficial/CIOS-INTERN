import { getOrgContextOr404, requireOrgRole } from "@/lib/active-org";
import CreateCoursePage from "@/app/(app)/instructor/create-course/page";

export const dynamic = "force-dynamic";

const STAFF_ROLES = ["owner", "org_admin", "instructor"] as const;

export default async function OrgCreateCoursePage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const ctx = await getOrgContextOr404(orgSlug);
  requireOrgRole(ctx, STAFF_ROLES);
  return <CreateCoursePage orgSlug={orgSlug} basePath={`/o/${orgSlug}/instructor`} />;
}
