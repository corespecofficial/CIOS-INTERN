import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { getChecklist } from "@/app/actions/checklist";
import { ChecklistDetailClient } from "./checklist-detail-client";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ id: string }> }

export default async function ChecklistDetailPage({ params }: Props) {
  const { id } = await params;
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");

  const res = await getChecklist(id);
  if (!res.ok) redirect("/checklist");

  return <ChecklistDetailClient checklist={res.data} userId={me.id} userRole={me.role} />;
}
