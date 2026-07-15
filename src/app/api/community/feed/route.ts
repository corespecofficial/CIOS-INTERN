import { NextResponse } from "next/server";
import { listFeedPosts } from "@/lib/db";
import { getActiveOrg } from "@/lib/active-org";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sort = url.searchParams.get("sort") || "new";
  const community = url.searchParams.get("community") || null;
  const orgSlug = url.searchParams.get("org");
  const org = orgSlug ? await getActiveOrg(orgSlug) : null;
  if (orgSlug && !org) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const posts = await listFeedPosts(sort as any, community, org?.org.id || null);
  return NextResponse.json({ posts });
}
