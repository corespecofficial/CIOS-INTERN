import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { getProjectById, getMySubmission } from "@/app/actions/custom-projects";
import { ProjectLandingClient } from "./project-landing-client";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectLandingPage({ params }: Props) {
  const { id } = await params;

  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");

  const [projectRes, subRes] = await Promise.all([
    getProjectById(id),
    getMySubmission(id),
  ]);

  if (!projectRes.ok) redirect("/projects");

  return (
    <ProjectLandingClient
      project={projectRes.data}
      mySubmission={subRes.ok ? subRes.data : null}
    />
  );
}
