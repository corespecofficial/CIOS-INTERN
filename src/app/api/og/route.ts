import { NextResponse } from "next/server";
import { fetchPublicHtml } from "@/lib/safe-link-preview";

export const runtime = "nodejs";

/** Lightweight OpenGraph fetcher. Returns { title, description, image, siteName }. */
export async function GET(req: Request) {
  const u = new URL(req.url).searchParams.get("url");
  if (!u) return NextResponse.json({ error: "missing url" }, { status: 400 });
  try {
    const { url, html } = await fetchPublicHtml(u);
    const pick = (re: RegExp) => html.match(re)?.[1]?.trim();
    const meta = (name: string) => pick(new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']+)["']`, "i"))
      || pick(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${name}["']`, "i"));
    const title = meta("og:title") || pick(/<title[^>]*>([^<]+)<\/title>/i) || url.toString();
    const description = meta("og:description") || meta("description") || "";
    const image = meta("og:image") || "";
    const siteName = meta("og:site_name") || url.hostname;
    return NextResponse.json({ title, description, image, siteName });
  } catch {
    return NextResponse.json({ error: "Unable to preview this URL" }, { status: 400 });
  }
}
