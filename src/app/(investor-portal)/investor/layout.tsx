import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentDbUser } from "@/lib/db";
import { getMyInvestorProfile } from "@/app/actions/investor";
import { InvestorShell } from "./investor-shell";

export const dynamic = "force-dynamic";

export default async function InvestorLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in?redirect_url=/investor/dashboard");

  // Onboarding gate. Admin/super_admin bypass for portal preview.
  // Differentiate "no profile yet" (→ onboarding) from "DB error" (→ dedicated
  // screen). The latter was creating the bounce loop — layout would redirect
  // to onboarding, the upsert would fail too, and we'd be back here.
  const bypass = me.role === "admin" || me.role === "super_admin";
  if (!bypass) {
    const res = await getMyInvestorProfile();
    if (!res.ok) {
      return (
        <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Nunito', sans-serif" }}>
          <div style={{ maxWidth: 520, padding: 32, borderRadius: 16, background: "rgba(239,83,80,0.08)", border: "1px solid rgba(239,83,80,0.3)", textAlign: "center" }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>⚠️</div>
            <h1 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800, color: "#F8FAFC" }}>Investor portal unavailable</h1>
            <p style={{ margin: "0 0 18px", fontSize: 14, color: "#FCA5A5", lineHeight: 1.55 }}>{res.error}</p>
            <p style={{ margin: "0 0 18px", fontSize: 12, color: "#94A3B8", lineHeight: 1.6 }}>
              Most often this means migration <code>p385_investors_v2.sql</code> hasn't been run on Supabase yet. Once it's applied, refresh this page.
            </p>
            <Link href="/" style={{ padding: "10px 20px", borderRadius: 10, background: "rgba(255,255,255,0.06)", color: "#F8FAFC", border: "1px solid rgba(255,255,255,0.12)", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>← Back to CIOS</Link>
          </div>
        </div>
      );
    }
    if (!res.data) redirect("/investor/onboarding");
  }

  return <InvestorShell>{children}</InvestorShell>;
}
