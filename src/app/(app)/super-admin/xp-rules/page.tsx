import { getCurrentDbUser } from "@/lib/db";
import { redirect } from "next/navigation";
import { XP_RULES } from "@/lib/gamification-shared";
import { getXPRulesOverride } from "@/app/actions/xp-admin";
import { XPRulesClient } from "./xp-rules-client";
import { supabaseAdmin } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function XPRulesPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  if (me.role !== "super_admin") redirect("/dashboard");

  const overrides = await getXPRulesOverride();

  let challenges: Array<{ id: string; title: string; starts_at: string; ends_at: string; active: boolean; prize_xp: number; prize_coins: number }> = [];
  try {
    const { data } = await supabaseAdmin().from("challenges").select("id, title, starts_at, ends_at, active, prize_xp, prize_coins").order("created_at", { ascending: false }).limit(30);
    challenges = data || [];
  } catch {/* ignore */}

  return <XPRulesClient defaults={XP_RULES} overrides={overrides} challenges={challenges} />;
}
