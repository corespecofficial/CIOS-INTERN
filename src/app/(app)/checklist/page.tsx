import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { getMyChecklists } from "@/app/actions/checklist";
import { ChecklistHomeClient } from "./checklist-home-client";

export const dynamic = "force-dynamic";

export default async function ChecklistPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");

  const res = await getMyChecklists();

  return (
    <ChecklistHomeClient
      checklists={res.ok ? res.data : []}
      userRole={me.role}
    />
  );
}
