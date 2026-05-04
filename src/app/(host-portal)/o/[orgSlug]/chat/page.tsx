import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getActiveOrg } from "@/lib/active-org";
import { supabaseAdmin } from "@/lib/db";
import { ChannelComposer } from "./channel-composer";

export const dynamic = "force-dynamic";

interface Channel {
  id: string;
  name: string;
  kind: string;
}

export default async function ChatPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const ctx = await getActiveOrg(orgSlug);
  if (!ctx) notFound();
  const isHost = ctx.isSuperAdmin || (ctx.memberRole && ["owner", "org_admin", "instructor"].includes(ctx.memberRole));

  const sb = supabaseAdmin();
  const { data } = await sb
    .from("org_channels")
    .select("id, name, kind")
    .eq("org_id", ctx.org.id)
    .order("created_at", { ascending: true });
  const channels = (data || []) as Channel[];

  // Auto-redirect into the first channel — saves a click for the common case.
  // The student portal does the same.
  if (channels.length > 0) redirect(`/o/${orgSlug}/chat/${channels[0].id}`);

  return (
    <div style={{ maxWidth: 600 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 16px 0" }}>Chat</h1>
      {isHost && <ChannelComposer orgId={ctx.org.id} />}
      <div style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 12, padding: 24, textAlign: "center", color: "#5A6478", fontSize: 13, marginTop: 12 }}>
        No channels yet. {isHost ? "Create one above." : "Your instructor will create channels soon."}
      </div>
      {/* Suppress unused import in this branch */}
      <Link href={`/o/${orgSlug}`} style={{ display: "none" }} />
    </div>
  );
}
