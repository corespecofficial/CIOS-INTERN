/**
 * Per-org host-portal shell. Resolves [orgSlug] → org + caller's per-org
 * role via getActiveOrg (cached per-request); 404s if the slug doesn't
 * exist or the caller isn't a member (and isn't super_admin).
 *
 * The middleware tenant guard already 404s unauthorized hits at the edge
 * before we get here — this layer is a defense-in-depth check that also
 * fetches the org row we need for the sidebar.
 */

import { notFound } from "next/navigation";
import { getActiveOrg } from "@/lib/active-org";
import { HostNav } from "./host-nav";

export const dynamic = "force-dynamic";

interface Props {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}

export default async function HostOrgLayout({ children, params }: Props) {
  const { orgSlug } = await params;
  const ctx = await getActiveOrg(orgSlug);
  if (!ctx) notFound();

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
      <main style={{ marginLeft: 240, padding: "32px 40px", minHeight: "100dvh" }}>
        {children}
      </main>
    </>
  );
}
