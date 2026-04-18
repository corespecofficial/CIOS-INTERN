import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { getEagleSubmissionById } from "@/app/actions/eagle";
import { EagleSubmissionView } from "./submission-view-client";

export const dynamic = "force-dynamic";

export default async function EagleSubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");

  const { id } = await params;
  const res = await getEagleSubmissionById(id);
  if (!res.ok) redirect("/eagle");

  return <EagleSubmissionView submission={res.data} />;
}
