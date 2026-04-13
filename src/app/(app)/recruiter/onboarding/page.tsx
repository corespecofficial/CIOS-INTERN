import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { redirect } from "next/navigation";
import { OnboardingClient } from "./onboarding-client";

export const dynamic = "force-dynamic";

export default async function RecruiterOnboardingPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  if (me.role !== "recruiter" && me.role !== "admin" && me.role !== "super_admin") redirect("/opportunities");
  const { data: profile } = await supabaseAdmin().from("recruiter_profiles").select("*").eq("user_id", me.id).maybeSingle();
  return <OnboardingClient initial={(profile as Record<string, unknown> | null) || null} />;
}
