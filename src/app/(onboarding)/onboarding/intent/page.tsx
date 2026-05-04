/**
 * Onboarding intent gate. First page every new signup hits before any
 * portal renders. Captures spam signals server-side, then renders the
 * client-side intent picker.
 *
 * If the user is already onboarded, bounce to their role home.
 */

import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getCurrentDbUser } from "@/lib/db";
import { ensureCurrentDbUser } from "@/app/actions/ensure-db-user";
import { recordSignupSignals } from "@/app/actions/record-signup-signals";
import { IntentClient } from "./intent-client";

export const dynamic = "force-dynamic";

export default async function OnboardingIntentPage({ searchParams }: {
  searchParams: Promise<{ ref?: string; invite?: string; code?: string }>;
}) {
  // Auth gate first — if Clerk doesn't know them, send to sign-in.
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/onboarding/intent");

  // Auto-heal: a Supabase row may be missing if a super-admin deleted
  // the user but the Clerk record persisted (or vice versa). The naive
  // `if (!me) redirect("/sign-in")` path used to loop forever in that
  // case — Clerk says signed-in, Supabase says no, sign-in says
  // already-signed-in, repeat. ensureCurrentDbUser re-creates the row
  // from the live Clerk identity so the user can move forward.
  let me = await getCurrentDbUser();
  if (!me) {
    await ensureCurrentDbUser();
    me = await getCurrentDbUser();
  }
  if (!me) {
    // Recreation failed (most often: orphan row blocking the email
    // UNIQUE constraint). Render an actionable error instead of
    // redirecting to /sign-in — that would just loop because Clerk
    // still says signed-in.
    return (
      <div style={{ minHeight: "100dvh", background: "#0A0E1A", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Nunito', system-ui, sans-serif" }}>
        <div style={{ maxWidth: 480, background: "#111827", border: "1px solid rgba(239,83,80,0.30)", borderRadius: 16, padding: 32, textAlign: "center", color: "#E8EDF5" }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>⚠️</div>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 8px" }}>Account sync needed</h1>
          <p style={{ fontSize: 13, color: "#8892A4", lineHeight: 1.6, margin: "0 0 18px" }}>
            We couldn&apos;t set up your account. This usually means a previous account
            with the same email needs to be cleared by an admin. Please contact support
            with your email and we&apos;ll reset it within minutes.
          </p>
          <a href="/sign-in?action=signOut" style={{ display: "inline-block", padding: "10px 22px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
            Sign out
          </a>
        </div>
      </div>
    );
  }

  // Re-entry rules:
  //   - Already onboarded AND already a privileged role → redirect away.
  //     Letting a creative_host / recruiter / mentor click "Switch
  //     intent" and pick "Just exploring" would silently demote them
  //     to public_user; that's destructive and almost never what they
  //     meant. Send them home instead.
  //   - Already onboarded BUT still a public_user → ALLOW re-entry.
  //     The "Switch intent" link in the visitor sidebar lands here;
  //     visitors are public_user by definition, so they can re-pick
  //     (e.g. switch from "just exploring" to "applying as mentor")
  //     without losing anything they had.
  //   - Not onboarded → render the gate (first-run flow).
  const onboarded = !!(me as unknown as { onboarding_completed_at?: string | null }).onboarding_completed_at;
  if (onboarded && me.role !== "public_user") {
    redirect("/post-auth");
  }

  // Capture signup risk signals from THIS browser (the webhook couldn't).
  // If the verdict is "block", the user has been auto-suspended; we still
  // render the page so they see a clear message and can contact support.
  const risk = await recordSignupSignals();

  const sp = await searchParams;

  if (risk.verdict === "block") {
    return (
      <div style={{ maxWidth: 520, margin: "80px auto", padding: 24, fontFamily: "'Nunito', sans-serif" }}>
        <div style={{ background: "#1F1216", border: "1px solid #5C2424", borderRadius: 16, padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🚫</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#E8EDF5", margin: "0 0 8px 0" }}>Account on hold</h1>
          <p style={{ fontSize: 14, color: "#8892A4", lineHeight: 1.6, margin: "0 0 16px 0" }}>
            Our system flagged unusual signup activity from your network. A super-admin
            has been notified and will review shortly. If this is a mistake, contact
            support with your email address: <strong style={{ color: "#E8EDF5" }}>{me.email}</strong>.
          </p>
          <a href="/contact" style={{ display: "inline-block", padding: "10px 20px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
            Contact support
          </a>
        </div>
      </div>
    );
  }

  return (
    <IntentClient
      me={{ id: me.id, name: me.name, email: me.email }}
      preset={{ ref: sp.ref, invite: sp.invite, code: sp.code }}
    />
  );
}
