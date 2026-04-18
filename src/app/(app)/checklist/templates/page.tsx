import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { getChecklistTemplates } from "@/app/actions/checklist";
import { ChecklistTemplatesClient } from "./checklist-templates-client";

export const dynamic = "force-dynamic";

export default async function ChecklistTemplatesPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");

  const res = await getChecklistTemplates();

  return <ChecklistTemplatesClient templates={res.ok ? res.data : []} userRole={me.role} />;
}
