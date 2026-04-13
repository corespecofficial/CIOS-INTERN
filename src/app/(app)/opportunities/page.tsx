import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { redirect } from "next/navigation";
import { OpportunitiesClient } from "./opportunities-client";

export const dynamic = "force-dynamic";

export default async function OpportunitiesPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");

  let opps: Array<Record<string, unknown>> = [];
  let applications: Array<Record<string, unknown>> = [];
  let saves: string[] = [];
  try {
    const sb = supabaseAdmin();
    const [oppsRes, appsRes, savesRes] = await Promise.all([
      sb.from("opportunities")
        .select("*, recruiter:recruiter_id(name, avatar_url), recruiter_profile:recruiter_profiles!recruiter_profiles_user_id_fkey(company_name, company_logo_url, verified, hires_count, rating)")
        .eq("status", "open").order("featured", { ascending: false }).order("created_at", { ascending: false }).limit(50),
      sb.from("opportunity_applications")
        .select("*, opportunity:opportunity_id(id, title, kind, location, remote)")
        .eq("applicant_id", me.id).order("created_at", { ascending: false }),
      sb.from("opportunity_saves").select("opportunity_id").eq("user_id", me.id),
    ]);
    opps = oppsRes.data || [];
    applications = appsRes.data || [];
    saves = ((savesRes.data || []) as Array<{ opportunity_id: string }>).map((s) => s.opportunity_id);
  } catch {/* tables may not exist yet */}

  return <OpportunitiesClient opps={opps} applications={applications} savedIds={saves} userRole={me.role} />;
}
