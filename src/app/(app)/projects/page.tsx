import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { getMyEagleSubmission } from "@/app/actions/eagle";
import { ProjectsHubClient } from "./projects-hub-client";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");

  const eagleRes = await getMyEagleSubmission();
  const eagleSubmission = eagleRes.ok ? eagleRes.data : null;

  return (
    <ProjectsHubClient
      eagleStatus={eagleSubmission?.status ?? null}
      eagleScore={eagleSubmission?.total_score ?? null}
    />
  );
}
