import { notFound } from "next/navigation";
import Link from "next/link";
import { getActiveOrg } from "@/lib/active-org";
import { supabaseAdmin } from "@/lib/db";
import { ChatComposer } from "@/app/(host-portal)/o/[orgSlug]/chat/[channelId]/chat-composer";

export const dynamic = "force-dynamic";
export const revalidate = 5;

interface Channel { id: string; name: string; kind: string; }
interface Message { id: string; body: string; created_at: string; author: { id: string; name: string; avatar_url: string | null } | null; }

const PAGE_SIZE = 80;

export default async function StudentChannelPage({ params }: { params: Promise<{ orgSlug: string; channelId: string }> }) {
  const { orgSlug, channelId } = await params;
  const ctx = await getActiveOrg(orgSlug);
  if (!ctx) notFound();

  const sb = supabaseAdmin();
  const [channelsRes, channelRes, messagesRes] = await Promise.all([
    sb.from("org_channels").select("id, name, kind").eq("org_id", ctx.org.id).order("created_at", { ascending: true }),
    sb.from("org_channels").select("id, name, kind").eq("id", channelId).eq("org_id", ctx.org.id).maybeSingle(),
    sb.from("org_messages")
      .select("id, body, created_at, author:users!org_messages_author_id_fkey(id, name, avatar_url)")
      .eq("org_id", ctx.org.id)
      .eq("channel_id", channelId)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE),
  ]);

  const channels = (channelsRes.data || []) as Channel[];
  const channel = channelRes.data as Channel | null;
  if (!channel) notFound();
  const messages = ((messagesRes.data || []) as unknown as Message[]).slice().reverse();

  return (
    <div style={{ display: "flex", gap: 16, height: "calc(100dvh - 64px)" }}>
      <aside style={{ width: 200, background: "#111827", border: "1px solid #1F2937", borderRadius: 10, padding: 12, overflowY: "auto" }}>
        <div style={{ fontSize: 10, color: "#5A6478", textTransform: "uppercase", letterSpacing: 0.5, padding: "4px 6px", marginBottom: 4 }}>Channels</div>
        {channels.map((c) => {
          const active = c.id === channelId;
          return (
            <Link key={c.id} href={`/s/${orgSlug}/chat/${c.id}`} style={{ display: "block", padding: "8px 10px", borderRadius: 6, fontSize: 13, color: active ? "#E8EDF5" : "#8892A4", background: active ? "#1E2937" : "transparent", fontWeight: active ? 700 : 500, textDecoration: "none", marginBottom: 2 }}>
              # {c.name}
            </Link>
          );
        })}
      </aside>

      <section style={{ flex: 1, display: "flex", flexDirection: "column", background: "#111827", border: "1px solid #1F2937", borderRadius: 10, overflow: "hidden" }}>
        <header style={{ padding: "14px 18px", borderBottom: "1px solid #1F2937" }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}># {channel.name}</div>
          <div style={{ fontSize: 11, color: "#5A6478" }}>{messages.length} recent · auto-refreshes every 5s</div>
        </header>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: "center", color: "#5A6478", fontSize: 13, marginTop: 40 }}>No messages yet.</div>
          ) : (
            messages.map((m) => (
              <div key={m.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1E2937", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#8892A4", overflow: "hidden", flexShrink: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {m.author?.avatar_url ? <img src={m.author.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (m.author?.name?.[0]?.toUpperCase() ?? "?")}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{m.author?.name ?? "Unknown"}</span>
                    <span style={{ fontSize: 10, color: "#5A6478" }}>{new Date(m.created_at).toLocaleTimeString()}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "#C7CFD8", lineHeight: 1.5, whiteSpace: "pre-wrap", marginTop: 2 }}>{m.body}</div>
                </div>
              </div>
            ))
          )}
        </div>

        <ChatComposer orgId={ctx.org.id} channelId={channel.id} />
      </section>
    </div>
  );
}
