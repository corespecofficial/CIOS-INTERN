import { BackBar } from "@/components/back-bar";
import { getCurrentDbUser } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/app/actions/live-sessions";
import { parseLiveEmbed } from "@/lib/live-embed";
import { LiveViewerClient } from "./viewer-client";

export const dynamic = "force-dynamic";

export default async function LiveSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  const { id } = await params;
  const r = await getSession(id);
  if (!r.ok || !r.data) notFound();
  const s = r.data;
  const parsed = parseLiveEmbed(s.embed_url);
  const isHost = s.host_id === me.id;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <BackBar to="/live" label="Back to live" />
      <LiveViewerClient session={s} embed={parsed} isHost={isHost} />
    </div>
  );
}
