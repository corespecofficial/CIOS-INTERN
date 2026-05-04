import { notFound, redirect } from "next/navigation";
import { getActiveOrg } from "@/lib/active-org";
import { supabaseAdmin } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function StudentChatIndex({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const ctx = await getActiveOrg(orgSlug);
  if (!ctx) notFound();

  const sb = supabaseAdmin();
  const { data } = await sb
    .from("org_channels")
    .select("id")
    .eq("org_id", ctx.org.id)
    .order("created_at", { ascending: true })
    .limit(1);
  const first = (data as { id: string }[] | null)?.[0];
  if (first) redirect(`/s/${orgSlug}/chat/${first.id}`);

  return (
    <div style={{ maxWidth: 600 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 16px 0" }}>Chat</h1>
      <div style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 12, padding: 24, textAlign: "center", color: "#5A6478", fontSize: 13 }}>
        No channels yet. Your instructor will create channels soon.
      </div>
    </div>
  );
}
