import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { getMyChecklists } from "@/app/actions/checklist";
import { ChecklistHistoryClient } from "./checklist-history-client";

export const dynamic = "force-dynamic";

export default async function ChecklistHistoryPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");

  const res = await getMyChecklists();
  const all = res.ok ? res.data : [];
  const completed = all.filter((c) => c.status === "completed" || c.status === "archived");

  return <ChecklistHistoryClient checklists={completed} />;
}
