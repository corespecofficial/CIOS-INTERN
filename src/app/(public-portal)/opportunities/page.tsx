import type { Metadata } from "next";
import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { OpportunitiesClient } from "./opportunities-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "CIOS Opportunities — jobs, gigs, internships for vetted talent",
  description:
    "Browse open roles from recruiters hiring through CIOS. Every candidate has a verified performance profile — XP, level, rank, projects. Apply free as a registered CIOS public user.",
  openGraph: {
    title: "CIOS Opportunities",
    description: "Jobs, gigs, internships — applicants verified by CIOS performance data.",
    type: "website",
  },
  alternates: { canonical: "/opportunities" },
};

export default async function OpportunitiesPage() {
  // Public-first: fetch open opportunities for everyone. Applications/saves
  // only load when signed in.
  const me = await getCurrentDbUser();
  const sb = supabaseAdmin();

  let opps: Array<Record<string, unknown>> = [];
  let applications: Array<Record<string, unknown>> = [];
  let saves: string[] = [];

  try {
    const oppsRes = await sb.from("opportunities")
      .select("*, recruiter:recruiter_id(name, avatar_url), recruiter_profile:recruiter_profiles!recruiter_profiles_user_id_fkey(company_name, company_logo_url, verified, hires_count, rating)")
      .eq("status", "open")
      .order("is_promoted", { ascending: false })
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(80);
    opps = oppsRes.data || [];

    if (me) {
      const [appsRes, savesRes] = await Promise.all([
        sb.from("opportunity_applications")
          .select("*, opportunity:opportunity_id(id, title, kind, location, remote)")
          .eq("applicant_id", me.id).order("created_at", { ascending: false }),
        sb.from("opportunity_saves").select("opportunity_id").eq("user_id", me.id),
      ]);
      applications = appsRes.data || [];
      saves = ((savesRes.data || []) as Array<{ opportunity_id: string }>).map((s) => s.opportunity_id);
    }
  } catch {
    // Tables may not exist yet — fall through with empty arrays.
  }

  return (
    <OpportunitiesClient
      opps={opps as never}
      applications={applications as never}
      savedIds={saves}
      userRole={me?.role ?? null}
    />
  );
}
