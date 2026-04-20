import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentDbUser } from "@/lib/db";
import { checkAIAccess } from "@/lib/ai-access";
import { InterviewPrepClient } from "./interview-prep-client";

export const dynamic = "force-dynamic";

export default async function InterviewPrepPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in?redirect_url=/ai-hub/interview-prep");

  const access = await checkAIAccess(me.id, "chat").catch(
    () => ({ allowed: false, reason: "not_granted" as const } as const),
  );

  if (!access.allowed) {
    return (
      <div style={{ maxWidth: 520, margin: "40px auto", fontFamily: "'Nunito', sans-serif", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 10 }}>🔒</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#E8EDF5", marginBottom: 8 }}>AI access required</div>
        <div style={{ fontSize: 13, color: "#8892A4", marginBottom: 20 }}>
          Interview Prep is an AI-powered feature. Ask your admin to grant AI access to your account.
        </div>
        <Link
          href="/support"
          style={{
            padding: "10px 22px",
            background: "linear-gradient(135deg,#8B5CF6,#7C3AED)",
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
    );
  }

  const firstName = (me.name || "there").split(" ")[0];
  return <InterviewPrepClient firstName={firstName} />;
}
