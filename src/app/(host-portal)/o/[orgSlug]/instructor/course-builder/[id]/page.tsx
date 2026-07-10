import { notFound } from "next/navigation";
import { getOrgContextOr404, requireOrgRole } from "@/lib/active-org";
import { getCourseWithModulesForEditor } from "@/lib/db";
import { BuilderClient } from "@/app/(app)/instructor/course-builder/[id]/builder-client";

export const dynamic = "force-dynamic";

const STAFF_ROLES = ["owner", "org_admin", "instructor"] as const;

export default async function OrgCourseBuilderPage({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string }>;
}) {
  const { orgSlug, id } = await params;
  const ctx = await getOrgContextOr404(orgSlug);
  requireOrgRole(ctx, STAFF_ROLES);
  const { course, modules } = await getCourseWithModulesForEditor(id);
  if (!course || course.org_id !== ctx.org.id) notFound();
  return (
    <BuilderClient
      course={course}
      initialModules={modules}
      basePath={`/o/${orgSlug}/instructor`}
      previewHref={`/s/${orgSlug}/courses/${course.id}`}
    />
  );
}
