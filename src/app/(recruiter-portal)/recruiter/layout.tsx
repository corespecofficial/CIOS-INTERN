import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { RecruiterShell } from "./recruiter-shell";

export const dynamic = "force-dynamic";

export default async function RecruiterLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  if (me.role !== "recruiter" && me.role !== "admin" && me.role !== "super_admin") redirect("/opportunities");

  let profile: { approval_status?: string; company_name?: string } | null = null;
  try {
    const { data } = await supabaseAdmin().from("recruiter_profiles")
      .select("approval_status, company_name").eq("user_id", me.id).maybeSingle();
    profile = data as { approval_status?: string; company_name?: string } | null;
  } catch {/* migration not run yet — treat as needs-onboarding */}

  const h = await headers();
  const pathname = h.get("x-pathname") || h.get("next-url") || h.get("referer") || "";
  const isOnboarding = pathname.includes("/recruiter/onboarding");
  const bypass = me.role === "admin" || me.role === "super_admin";

  if (!bypass && !profile && !isOnboarding) redirect("/recruiter/onboarding");

  if (!bypass && profile && profile.approval_status && profile.approval_status !== "approved" && !isOnboarding) {
    const status = profile.approval_status;
    const s = status === "rejected" ? { emoji: "⚠️", title: "Application not approved", desc: "Please update your details and resubmit, or contact support.", color: "#EF5350" }
          : status === "suspended" ? { emoji: "🚫", title: "Account suspended", desc: "Contact support to resolve.", color: "#EF5350" }
          : { emoji: "🕒", title: "Awaiting Super Admin review", desc: "We're reviewing your company details. You'll be notified the moment access is approved.", color: "#FFC107" };
    return (
      <div style={{ maxWidth: 640, margin: "40px auto", fontFamily: "'Nunito', sans-serif", padding: 20 }}>
        <div style={{ background: "#111827", border: `1px solid ${s.color}44`, borderRadius: 16, padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>{s.emoji}</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#E8EDF5", margin: "0 0 8px 0" }}>{s.title}</h1>
          <p style={{ fontSize: 14, color: "#8892A4", lineHeight: 1.6, margin: "0 0 20px 0" }}>
            <strong style={{ color: "#E8EDF5" }}>{profile.company_name}</strong><br />{s.desc}
          </p>
          {(status === "pending" || status === "rejected") && <Link href="/recruiter/onboarding" style={{ display: "inline-block", padding: "10px 22px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>{status === "rejected" ? "Update and resubmit" : "View / edit submission"}</Link>}
          <div style={{ marginTop: 20, fontSize: 12, color: "#5A6478" }}>Questions? <Link href="/contact" style={{ color: "#1E88E5" }}>Contact support</Link></div>
        </div>
      </div>
    );
  }

  return <RecruiterShell>{children}</RecruiterShell>;
}
