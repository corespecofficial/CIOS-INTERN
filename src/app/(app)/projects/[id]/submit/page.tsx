import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { getProjectById, getMySubmission } from "@/app/actions/custom-projects";
import { ProjectWizardClient } from "./project-wizard-client";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectSubmitPage({ params }: Props) {
  const { id } = await params;

  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");

  const [projectRes, subRes] = await Promise.all([
    getProjectById(id),
    getMySubmission(id),
  ]);

  if (!projectRes.ok) redirect("/projects");

  const submission = subRes.ok ? subRes.data : null;

  // Redirect if already graded
  if (submission?.status === "graded") {
    redirect(`/projects/${id}/submissions/${submission.id}`);
  }

  return (
    <ProjectWizardClient
      project={projectRes.data}
      existingAnswers={(submission?.answers ?? {}) as Record<string, unknown>}
    />
  );
}
