import { notFound, redirect } from "next/navigation";
import { getActiveOrg } from "@/lib/active-org";
import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { listIncomingPeerRequests, listMyContactRequests } from "@/app/actions/messaging-privacy";
import { RequestsClient } from "@/app/(app)/messages/requests/requests-client";

export const dynamic = "force-dynamic";
export default async function OrgRequestsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const ctx = await getActiveOrg(orgSlug); if (!ctx) notFound();
  const me = await getCurrentDbUser(); if (!me) redirect("/sign-in");
  const [{ data: members }, outgoingR, incomingR] = await Promise.all([
    supabaseAdmin().from("org_members").select("user_id, user:users!org_members_user_id_fkey(intern_id)").eq("org_id", ctx.org.id).eq("status", "active"),
    listMyContactRequests(), listIncomingPeerRequests(),
  ]);
  type Member = { user_id: string; user: { intern_id: string | null } | { intern_id: string | null }[] | null };
  const rows = (members || []) as unknown as Member[];
  const ids = new Set(rows.map((m) => m.user_id));
  const internIds = new Set(rows.flatMap((m) => { const u = Array.isArray(m.user) ? m.user[0] : m.user; return u?.intern_id ? [u.intern_id] : []; }));
  const outgoing = outgoingR.ok ? (outgoingR.data! as Array<Record<string, unknown>>).filter((r) => internIds.has(String(r.target_intern_id || ""))) : [];
  const incoming = incomingR.ok ? incomingR.data!.filter((r) => ids.has(r.requester_id)) : [];
  return <RequestsClient outgoing={outgoing as Parameters<typeof RequestsClient>[0]["outgoing"]} incoming={incoming} />;
}
