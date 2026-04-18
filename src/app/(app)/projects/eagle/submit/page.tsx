import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { getMyEagleSubmission } from "@/app/actions/eagle";
import { getEagleDeadline } from "@/lib/eagle-helpers";
import { EagleWizardClient } from "@/app/(app)/eagle/submit/eagle-wizard-client";

export const dynamic = "force-dynamic";

export default async function ProjectEagleSubmitPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");

  const submissionRes = await getMyEagleSubmission();
  const submission = submissionRes.ok ? submissionRes.data : null;

  if (submission?.status === "graded") {
    redirect(`/projects/eagle/${submission.id}`);
  }

  const deadline = getEagleDeadline().toISOString();

  return (
    <EagleWizardClient
      initialSubmission={submission}
      deadline={deadline}
      userName={me.full_name ?? "Intern"}
    />
  );
}
