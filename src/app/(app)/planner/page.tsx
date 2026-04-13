import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { redirect } from "next/navigation";
import { PlannerClient } from "./planner-client";

export const dynamic = "force-dynamic";

export default async function PlannerPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");

  let plans: Array<Record<string, unknown>> = [];
  let itemsByPlan: Record<string, Array<Record<string, unknown>>> = {};
  try {
    const sb = supabaseAdmin();
    const { data: ps } = await sb.from("plans").select("*").eq("owner_id", me.id).eq("archived", false).order("sort_order");
    plans = ps || [];
    const ids = plans.map((p) => p.id as string);
    if (ids.length > 0) {
      const { data: is } = await sb.from("plan_items").select("*").in("plan_id", ids).order("sort_order");
      itemsByPlan = {};
      for (const it of (is || []) as Array<{ plan_id: string }>) {
        (itemsByPlan[it.plan_id] ||= []).push(it as unknown as Record<string, unknown>);
      }
    }
  } catch {/* table may not exist yet */}

  return <PlannerClient initialPlans={plans} initialItemsByPlan={itemsByPlan} />;
}
