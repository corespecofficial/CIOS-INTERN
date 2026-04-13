import { notFound } from "next/navigation";
import { getPostDetail, getCurrentDbUser } from "@/lib/db";
import { PostDetailClient } from "./post-client";

export const dynamic = "force-dynamic";

export default async function CommunityPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ post, comments }, me] = await Promise.all([
    getPostDetail(id),
    getCurrentDbUser(),
  ]);
  if (!post) notFound();
  return (
    <PostDetailClient
      post={post}
      initialComments={comments}
      me={{ id: me?.id || "", name: me?.name || "You", avatarUrl: me?.avatar_url || null, role: me?.role || "intern", reputation: me?.reputation || 0 }}
    />
  );
}
