import { notFound, redirect } from "next/navigation";
import { getActiveOrg } from "@/lib/active-org";
import { getCurrentDbUser, listCommunities, listFeedPosts, supabaseAdmin } from "@/lib/db";
import { CommunityClient } from "@/app/(app)/community/community-client";

export const dynamic = "force-dynamic";

export default async function OrgCommunityPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const ctx = await getActiveOrg(orgSlug);
  if (!ctx) notFound();
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");

  const sb = supabaseAdmin();
  let groups = await listCommunities(ctx.org.id);
  if (groups.length === 0) {
    const { data: created } = await sb.from("communities").insert({
      name: ctx.org.name,
      description: `${ctx.org.name} community`,
      created_by: me.id,
      is_private: true,
      tags: [],
      org_id: ctx.org.id,
    }).select("id").single();
    if (created) {
      await sb.from("community_members").upsert({ community_id: created.id, user_id: me.id, role: "owner" }, { onConflict: "community_id,user_id" });
      groups = await listCommunities(ctx.org.id);
    }
  }

  const posts = await listFeedPosts("new", null, ctx.org.id);
  const { data: contributors } = await sb.from("org_members")
    .select("user:users!org_members_user_id_fkey(id,name,avatar_url,role,reputation)")
    .eq("org_id", ctx.org.id).eq("status", "active").limit(8);
  type ContributorJoin = { user: { id: string; name: string; avatar_url: string | null; role: string; reputation: number } | Array<{ id: string; name: string; avatar_url: string | null; role: string; reputation: number }> | null };
  const top = ((contributors || []) as unknown as ContributorJoin[]).flatMap((row) => {
    const user = Array.isArray(row.user) ? row.user[0] : row.user;
    return user ? [user] : [];
  }).sort((a, b) => (b.reputation || 0) - (a.reputation || 0));

  return <CommunityClient
    me={{ id: me.id, name: me.name, avatarUrl: me.avatar_url, role: me.role, reputation: me.reputation || 0 }}
    initialPosts={posts}
    groups={groups}
    topContributors={top}
    trending={[]}
    orgSlug={orgSlug}
  />;
}
