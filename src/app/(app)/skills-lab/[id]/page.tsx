import { notFound, redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { getAssessmentForAttempt } from "@/app/actions/skills-lab";
import AssessmentPlayer from "./assessment-player";

export const dynamic = "force-dynamic";

export default async function AssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  const res = await getAssessmentForAttempt(id);
  if (!res.ok) notFound();
  return <AssessmentPlayer assessment={res.data.assessment} questions={res.data.questions} />;
}
