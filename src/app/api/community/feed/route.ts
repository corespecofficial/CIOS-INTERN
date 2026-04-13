import { NextResponse } from "next/server";
import { listFeedPosts } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sort = url.searchParams.get("sort") || "new";
  const community = url.searchParams.get("community") || null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const posts = await listFeedPosts(sort as any, community);
  return NextResponse.json({ posts });
}
