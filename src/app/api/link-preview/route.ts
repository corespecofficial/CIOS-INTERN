import { NextResponse } from "next/server";

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
    const parsed = new URL(target);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return NextResponse.json({ error: "invalid protocol" }, { status: 400 });
    }
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 5000);
    const res = await fetch(target, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; CIOSBot/1.0)" },
      signal: ctl.signal,
      redirect: "follow",
    }).finally(() => clearTimeout(to));
    if (!res.ok) return NextResponse.json({ error: `upstream ${res.status}` }, { status: 502 });
    const type = res.headers.get("content-type") || "";
    if (!type.includes("text/html")) return NextResponse.json({ error: "not html" }, { status: 415 });
    const html = (await res.text()).slice(0, 200 * 1024); // cap at 200 KB

    const title =
      pickMeta(html, ["og:title", "twitter:title"]) ||
      (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || "").trim();
    const description =
      pickMeta(html, ["og:description", "twitter:description", "description"]) || "";
    let image = pickMeta(html, ["og:image", "twitter:image"]);
    if (image && image.startsWith("/")) image = `${parsed.origin}${image}`;
    const siteName = pickMeta(html, ["og:site_name"]) || parsed.hostname;

    const preview: Preview = { url: target, title: title || parsed.hostname, description, image, siteName };
    return NextResponse.json(preview, {
      headers: { "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
