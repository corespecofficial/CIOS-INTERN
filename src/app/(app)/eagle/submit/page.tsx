import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { getMyEagleSubmission, getEagleDeadline } from "@/app/actions/eagle";
import { EagleWizardClient } from "./eagle-wizard-client";

export const dynamic = "force-dynamic";

export default async function EagleSubmitPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");

  const submissionRes = await getMyEagleSubmission();
  const submission = submissionRes.ok ? submissionRes.data : null;

  // If already graded, redirect to view
  if (submission?.status === "graded") {
    redirect(`/eagle/${submission.id}`);
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
