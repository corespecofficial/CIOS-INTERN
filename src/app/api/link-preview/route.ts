import { NextResponse } from "next/server";
import { fetchPublicHtml } from "@/lib/safe-link-preview";

export const runtime = "nodejs";

interface Preview { url: string; title: string; description: string; image: string | null; siteName: string | null; }

function pickMeta(html: string, names: string[]): string | null {
  for (const name of names) {
    const re = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["']`, "i");
    const m = html.match(re);
    if (m) return m[1];
    const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${name}["']`, "i");
    const m2 = html.match(re2);
    if (m2) return m2[1];
  }
  return null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get("url");
  if (!target) return NextResponse.json({ error: "url required" }, { status: 400 });
  try {
    const { url: parsed, html } = await fetchPublicHtml(target);

    const title =
      pickMeta(html, ["og:title", "twitter:title"]) ||
      (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || "").trim();
    const description =
      pickMeta(html, ["og:description", "twitter:description", "description"]) || "";
    let image = pickMeta(html, ["og:image", "twitter:image"]);
    if (image && image.startsWith("/")) image = `${parsed.origin}${image}`;
    const siteName = pickMeta(html, ["og:site_name"]) || parsed.hostname;

    const preview: Preview = { url: parsed.toString(), title: title || parsed.hostname, description, image, siteName };
    return NextResponse.json(preview, {
      headers: { "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch {
    return NextResponse.json({ error: "Unable to preview this URL" }, { status: 400 });
  }
}
