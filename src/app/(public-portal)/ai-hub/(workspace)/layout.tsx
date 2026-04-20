import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { getCurrentDbUser } from "@/lib/db";
import { ensureCurrentDbUser } from "@/app/actions/ensure-db-user";
import { checkAIAccess } from "@/lib/ai-access";
import { WorkspaceShell } from "./_components/workspace-shell";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  // Anonymous visitors go to sign-in, not the self-repair path.
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/ai-hub/chat");

  // First try the cached Supabase row. If the row doesn't exist (or the
  // read transiently errored), attempt a one-shot repair via ensureCurrentDbUser
  // — that's the same logic the /post-auth page runs after sign-up — before
  // bouncing the user back to sign-in.
  let me = await getCurrentDbUser();
  if (!me) {
    const repair = await ensureCurrentDbUser();
    if (repair.ok) me = await getCurrentDbUser();
  }
  if (!me) redirect("/sign-in?redirect_url=/ai-hub/chat");

  const decision = await checkAIAccess(me.id, "chat").catch(
    () => ({ allowed: false, reason: "not_granted" as const } as const),
  );

  if (!decision.allowed) {
    return (
      <div style={{ maxWidth: 640, margin: "40px auto", fontFamily: "'Nunito', sans-serif" }}>
        <div
          style={{
            background: "linear-gradient(135deg, rgba(139,92,246,0.12), #111827)",
            border: "1px solid rgba(139,92,246,0.3)",
            borderRadius: 18,
            padding: 40,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 56, marginBottom: 10 }}>🔒</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>
            AI Hub access is restricted
          </h1>
          <p style={{ color: "#8892A4", fontSize: 14, lineHeight: 1.6, margin: "10px 0 20px 0" }}>
            {decision.reason === "expired" &&
              "Your access has expired. Please request a renewal from your Super Admin."}
            {decision.reason === "quota_exceeded" &&
              `You've used your daily quota of ${decision.dailyCap?.toLocaleString()} tokens. Try again tomorrow.`}
            {(!decision.reason || decision.reason === "not_granted") &&
              "AI Hub access has not been granted yet. Ask your Super Admin to enable your account."}
          </p>
          <Link
            href="/support"
            style={{
              display: "inline-block",
              padding: "10px 22px",
              background: "linear-gradient(135deg, #8B5CF6, #7C3AED)",
              color: "#fff",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Request access
          </Link>
        </div>
      </div>
    );
  }

  return <WorkspaceShell>{children}</WorkspaceShell>;
}
