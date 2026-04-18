import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { getMyEagleSubmission } from "@/app/actions/eagle";
import { getEagleDeadline } from "@/lib/eagle-helpers";
import { EagleLandingClient } from "@/app/(app)/eagle/eagle-landing-client";

export const dynamic = "force-dynamic";

export default async function ProjectEaglePage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");

  const submissionRes = await getMyEagleSubmission();
  const submission = submissionRes.ok ? submissionRes.data : null;
  const deadline = getEagleDeadline().toISOString();

  return (
    <EagleLandingClient
      submission={submission}
      deadline={deadline}
      userName={me.full_name ?? "Intern"}
    />
  );
}
