import { notFound, redirect } from "next/navigation";
import { getActiveOrg } from "@/lib/active-org";
import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { listMyContacts } from "@/app/actions/messaging-privacy";
import { ContactsClient } from "@/app/(app)/messages/contacts/contacts-client";

export const dynamic = "force-dynamic";
export default async function OrgContactsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const ctx = await getActiveOrg(orgSlug); if (!ctx) notFound();
  const me = await getCurrentDbUser(); if (!me) redirect("/sign-in");
  const [{ data: members }, result] = await Promise.all([
    supabaseAdmin().from("org_members").select("user_id").eq("org_id", ctx.org.id).eq("status", "active"),
    listMyContacts(),
  ]);
  const ids = new Set((members || []).map((m: { user_id: string }) => m.user_id));
  return <ContactsClient initial={result.ok ? result.data!.filter((c) => ids.has(c.id)) : []} myRole={me.role} />;
}
