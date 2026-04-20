import { redirect } from "next/navigation";
import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { RecruiterBillingClient } from "./billing-client";

export const dynamic = "force-dynamic";

export default async function RecruiterBillingPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in?redirect_url=/recruiter/billing");
  if (me.role !== "recruiter" && me.role !== "admin" && me.role !== "super_admin") redirect("/opportunities");

  const { data } = await supabaseAdmin()
    .from("recruiter_profiles")
    .select("plan_tier, active_listing_count, plan_renews_at")
    .eq("user_id", me.id)
    .maybeSingle();

  const profile = (data as { plan_tier?: string; active_listing_count?: number; plan_renews_at?: string } | null);

  return (
    <RecruiterBillingClient
      currentPlan={profile?.plan_tier ?? "free"}
      activeListings={profile?.active_listing_count ?? 0}
      renewsAt={profile?.plan_renews_at ?? null}
      isAdmin={me.role === "admin" || me.role === "super_admin"}
    />
  );
}
