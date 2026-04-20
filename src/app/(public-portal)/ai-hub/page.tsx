import Link from "next/link";
import { getCurrentDbUser } from "@/lib/db";
import { redirect } from "next/navigation";
import { checkAIAccess } from "@/lib/ai-access";
import AIHubClient from "./ai-hub-client";

export const dynamic = "force-dynamic";

export default async function AIHubPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");

  const decision = await checkAIAccess(me.id, "chat").catch(() => ({ allowed: false, reason: "not_granted" as const }));

  if (!decision.allowed) {
    return (
      <div style={{ maxWidth: 640, margin: "40px auto", fontFamily: "'Nunito', sans-serif" }}>
        <div style={{ background: "linear-gradient(135deg, rgba(171,71,188,0.12), #111827)", border: "1px solid rgba(171,71,188,0.25)", borderRadius: 18, padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 56, marginBottom: 10 }}>🔒</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>AI Tools access is restricted</h1>
          <p style={{ color: "#8892A4", fontSize: 14, lineHeight: 1.6, margin: "10px 0 20px 0" }}>
            {decision.reason === "expired" && "Your access has expired. Please request a renewal from your Super Admin."}
            {decision.reason === "quota_exceeded" && `You've used your daily quota of ${decision.dailyCap?.toLocaleString()} tokens. Try again tomorrow.`}
            {(!decision.reason || decision.reason === "not_granted") && "AI Tools access has not been granted yet. Ask your Super Admin to enable your account."}
          </p>
          <Link href="/support" style={{ display: "inline-block", padding: "10px 22px", background: "linear-gradient(135deg, #AB47BC, #8E24AA)", color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
            Request access
          </Link>
        </div>
        <div style={{ marginTop: 20, textAlign: "center", fontSize: 12, color: "#5A6478" }}>
          Super Admins can grant access at <Link href="/super-admin/ai-access" style={{ color: "#AB47BC" }}>/super-admin/ai-access</Link>
        </div>
      </div>
    );
  }

  return <AIHubClient />;
}
