import { listRecentPosts, countPosts } from "@/lib/db";
import { ModeratorDashboard } from "@/app/(app)/dashboard/portal-dashboards";

export const dynamic = "force-dynamic";

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function ModeratorPage() {
  const [posts, total] = await Promise.all([listRecentPosts(10), countPosts()]);
  return (
    <ModeratorDashboard
      stats={{ pending: total, warnings: 0, resolvedToday: 0 }}
      posts={posts.map((p) => ({
        id: p.id,
        title: p.title,
        author: p.author_name || "Unknown",
        community: p.community_name || "General",
        createdAt: timeAgo(p.created_at),
        upvotes: p.upvotes,
        downvotes: p.downvotes,
        commentCount: p.comment_count,
      }))}
    />
  );
}
