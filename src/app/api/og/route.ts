import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Lightweight OpenGraph fetcher. Returns { title, description, image, siteName }. */
export async function GET(req: Request) {
  const u = new URL(req.url).searchParams.get("url");
  if (!u) return NextResponse.json({ error: "missing url" }, { status: 400 });
  try {
    const res = await fetch(u, {
      headers: { "user-agent": "Mozilla/5.0 (CIOS link-preview)" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return NextResponse.json({ error: `status ${res.status}` }, { status: 200 });
    const html = await res.text();
    const pick = (re: RegExp) => html.match(re)?.[1]?.trim();
    const meta = (name: string) => pick(new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']+)["']`, "i"))
      || pick(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${name}["']`, "i"));
    const title = meta("og:title") || pick(/<title[^>]*>([^<]+)<\/title>/i) || u;
    const description = meta("og:description") || meta("description") || "";
    const image = meta("og:image") || "";
    const siteName = meta("og:site_name") || new URL(u).hostname;
    return NextResponse.json({ title, description, image, siteName });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 200 });
  }
}
