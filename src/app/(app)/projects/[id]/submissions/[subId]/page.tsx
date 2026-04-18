import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { getProjectSubmissionById } from "@/app/actions/custom-projects";
import { SubmissionViewClient } from "./submission-view-client";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string; subId: string }>;
}

export default async function SubmissionViewPage({ params }: Props) {
  const { id, subId } = await params;

  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");

  const res = await getProjectSubmissionById(subId);
  if (!res.ok) redirect(`/projects/${id}`);

  return <SubmissionViewClient submission={res.data} projectId={id} />;
}
