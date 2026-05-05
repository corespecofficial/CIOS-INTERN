/**
 * Per-org host-portal shell. Resolves [orgSlug] → org context.
 *
 * Failure modes are differentiated via getOrgEntryStatus so the user
 * sees a real explanation when their org is suspended/archived,
 * instead of a bare 404. Strangers / non-members still get 404 for
 * privacy (so org slugs aren't enumerable).
 *
 * The middleware tenant guard already 404s unauthorized hits at the
 * edge before we get here — this layer is defense-in-depth.
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { getOrgEntryStatus } from "@/lib/active-org";
import { HostNav } from "./host-nav";
import { HostHeader } from "./host-header";
import { MobileDrawer } from "@/components/portal/mobile-drawer";
import { CommandPalette } from "@/components/command-palette";

export const dynamic = "force-dynamic";

interface Props {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}

export default async function HostOrgLayout({ children, params }: Props) {
  const { orgSlug } = await params;
  const status = await getOrgEntryStatus(orgSlug);

  if (!status.ok) {
    if (status.failure.kind === "not_found" || status.failure.kind === "signed_out") notFound();
    return <OrgUnavailable failure={status.failure} />;
  }

  const ctx = status.ctx;
  // Host-side portal — only owners/admins/instructors. Students get the
  // /s/<slug> portal instead. Super-admin can preview either.
  const allowedHostRoles: ReadonlyArray<string> = ["owner", "org_admin", "instructor"];
  const allowed = ctx.isSuperAdmin || (ctx.memberRole && allowedHostRoles.includes(ctx.memberRole));
  if (!allowed) notFound();

  return (
    <>
      <HostNav
        orgSlug={ctx.org.slug}
        orgName={ctx.org.name}
        memberRole={ctx.memberRole}
        isSuperAdmin={ctx.isSuperAdmin}
      />
      <MobileDrawer />
      <div data-portal-main style={{ marginLeft: 240, minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
        <HostHeader
          orgSlug={ctx.org.slug}
          orgName={ctx.org.name}
          memberRole={ctx.memberRole}
          isSuperAdmin={ctx.isSuperAdmin}
        />
        <main style={{ flex: 1, padding: "32px 40px" }}>
          {children}
        </main>
        {/* Cmd+K palette — wires the search input in HostHeader to the
            shared command palette. CommandPalette filters by Clerk role
            so the host only sees actions they can actually take. */}
        <CommandPalette />
      </div>
    </>
  );
}

function OrgUnavailable({ failure }: { failure: { kind: "suspended" | "archived"; org: { name: string; slug: string } } }) {
  const isSuspended = failure.kind === "suspended";
  const tint = isSuspended ? "#FFA726" : "#5A6478";
  return (
    <div style={{ minHeight: "100dvh", background: "#0A0E1A", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Nunito', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 520, background: "#111827", border: `1px solid ${tint}55`, borderRadius: 16, padding: 32, textAlign: "center", color: "#E8EDF5" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>{isSuspended ? "⏸" : "🗄"}</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 6px" }}>
          {isSuspended ? "This org is suspended" : "This org is archived"}
        </h1>
        <p style={{ fontSize: 13, color: "#8892A4", lineHeight: 1.6, margin: "0 0 20px" }}>
          <strong style={{ color: "#E8EDF5" }}>{failure.org.name}</strong> is currently {failure.kind}.
          {isSuspended
            ? " Contact CIOS support if you believe this is in error."
            : " Past content is preserved but no new activity is allowed."}
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/o" style={{ padding: "10px 20px", background: "transparent", color: tint, border: `1px solid ${tint}55`, borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
            ← All my orgs
          </Link>
          <Link href="/dashboard" style={{ padding: "10px 20px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
            Back to CIOS
          </Link>
        </div>
      </div>
    </div>
  );
}
