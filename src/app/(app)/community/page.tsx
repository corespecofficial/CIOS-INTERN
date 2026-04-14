import { listFeedPosts, listCommunities, getCurrentDbUser, getTopContributors } from "@/lib/db";
import { listTrendingTags } from "@/app/actions/community";
import { CommunityClient } from "./community-client";

export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  const [me, posts, groups, top, trendingR] = await Promise.all([
    getCurrentDbUser(),
    listFeedPosts("new"),
    listCommunities(),
    getTopContributors(8),
    listTrendingTags(),
  ]);
  const trending = trendingR.ok ? trendingR.data || [] : [];

  return (
    <CommunityClient
      me={{ id: me?.id || "", name: me?.name || "You", avatarUrl: me?.avatar_url || null, role: me?.role || "intern", reputation: me?.reputation || 0 }}
      initialPosts={posts}
      groups={groups}
      topContributors={top}
      trending={trending}
    />
  );
}
