import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { getAllProjectsAdmin } from "@/app/actions/custom-projects";
import { getEagleSubmissionsForGrading, getEagleAnalytics } from "@/app/actions/eagle";
import { AdminProjectsHubClient } from "./admin-projects-hub-client";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ tab?: string }>;
}

export default async function AdminProjectsPage({ searchParams }: Props) {
  const { tab } = await searchParams;

  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  if (!["admin", "super_admin", "moderator"].includes(me.role)) redirect("/dashboard");

  const [projectsRes, eagleSubsRes, eagleAnalyticsRes] = await Promise.all([
    getAllProjectsAdmin(),
    getEagleSubmissionsForGrading(),
    getEagleAnalytics(),
  ]);

  return (
    <AdminProjectsHubClient
      projects={projectsRes.ok ? projectsRes.data : []}
      eagleSubmissions={eagleSubsRes.ok ? eagleSubsRes.data : []}
      eagleAnalytics={eagleAnalyticsRes.ok ? eagleAnalyticsRes.data : null}
      defaultTab={(tab as "projects" | "grading" | "analytics" | "eagle-grading" | "eagle-analytics") ?? "projects"}
    />
  );
}
