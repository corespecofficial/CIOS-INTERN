import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { ensureCurrentDbUser } from "@/app/actions/ensure-db-user";
import { VisitorShell } from "./visitor-shell";

export const dynamic = "force-dynamic";

export default async function VisitorLayout({ children }: { children: React.ReactNode }) {
  // Authn only — middleware enforces /visitor authz against Clerk role.
  // We do NOT gate on Supabase users.role here (drift caused a layout-level
  // bounce loop with /post-auth). If drift is detected we silently
  // reconcile Supabase to Clerk so the next page load is consistent.
  const { userId, sessionClaims } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/visitor");

  // Auto-heal Clerk↔Supabase orphans. If a super-admin deleted the user
  // from Supabase but the Clerk session still exists, getCurrentDbUser
  // returns null. Without this self-heal, redirecting to /sign-in just
  // bounces back here (Clerk says signed-in) → infinite loop. Calling
  // ensureCurrentDbUser recreates the row from live Clerk identity.
  let me = await getCurrentDbUser();
  if (!me) {
    await ensureCurrentDbUser();
    me = await getCurrentDbUser();
  }
  if (!me) redirect("/sign-in?redirect_url=/visitor");

  const claims = sessionClaims as Record<string, unknown> | null;
  const meta = (claims?.publicMetadata ?? claims?.metadata ?? null) as Record<string, unknown> | null;
  const clerkRole = typeof meta?.role === "string" ? (meta.role as string) : null;
  if (clerkRole && clerkRole !== me.role) {
    try {
      await supabaseAdmin().from("users").update({ role: clerkRole }).eq("id", me.id);
      console.info(`[visitor-layout] reconciled Supabase role ${me.role}→${clerkRole} for ${userId}`);
    } catch (e) {
      console.warn("[visitor-layout] reconcile failed (non-fatal):", e);
    }
  }

  return <VisitorShell name={me.name || "Visitor"}>{children}</VisitorShell>;
}
