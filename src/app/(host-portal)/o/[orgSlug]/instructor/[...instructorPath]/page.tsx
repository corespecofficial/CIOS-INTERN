import { redirect } from "next/navigation";
import { getOrgContextOr404, requireOrgRole } from "@/lib/active-org";

export const dynamic = "force-dynamic";
const STAFF = ["owner", "org_admin", "instructor"] as const;

/** Compatibility redirects replace the former repeated instructor placeholder. */
export default async function LegacyInstructorRoute({ params }: { params: Promise<{ orgSlug: string; instructorPath: string[] }> }) {
  const { orgSlug, instructorPath } = await params;
  const ctx = await getOrgContextOr404(orgSlug);
  requireOrgRole(ctx, STAFF);
  const destinations: Record<string, string> = {
    students: `/o/${orgSlug}/members`,
    submissions: `/o/${orgSlug}/assignments#submissions`,
    "schedule-class": `/o/${orgSlug}/announcements`,
    quizzes: `/o/${orgSlug}/lessons`,
    certificates: `/o/${orgSlug}/analytics#reports`,
    earnings: `/o/${orgSlug}/analytics#finance`,
  };
  redirect(destinations[instructorPath.join("/")] ?? `/o/${orgSlug}/instructor`);
}
