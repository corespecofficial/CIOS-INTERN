"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { detectEmbed } from "@/lib/link-embed";

interface OgData { title?: string; description?: string; image?: string; siteName?: string }

export function LinkEmbedCard({ url }: { url: string }) {
  const embed = detectEmbed(url);
  const [og, setOg] = useState<OgData | null>(null);

  useEffect(() => {
    if (!embed || embed.kind !== "generic") return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/og?url=${encodeURIComponent(url)}`);
        const data = await r.json();
        if (!cancelled && !data.error) setOg(data);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [url, embed]);

  if (!embed) return null;

  if (embed.kind === "youtube" || embed.kind === "vimeo") {
    return (
      <div style={{ position: "relative", paddingBottom: "56.25%", background: "#000", borderRadius: 10, overflow: "hidden", margin: "4px 0 8px" }}>
        <iframe src={embed.embedUrl} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }} />
      </div>
    );
  }

  if (embed.kind === "twitter") {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
        style={{ display: "flex", gap: 10, padding: 10, background: "#0A0E1A", border: "1px solid rgba(29,161,242,0.3)", borderRadius: 10, textDecoration: "none", margin: "4px 0 8px" }}>
        <div style={{ fontSize: 22 }}>𝕏</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#E8EDF5" }}>Post on X</div>
          <div style={{ fontSize: 11, color: "#8892A4", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{url}</div>
        </div>
        <div style={{ fontSize: 11, color: "#1DA1F2" }}>Open →</div>
      </a>
    );
  }

  if (embed.kind === "github") {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
        style={{ display: "flex", gap: 10, padding: 10, background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, textDecoration: "none", margin: "4px 0 8px" }}>
        <div style={{ fontSize: 22 }}>🐙</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#E8EDF5" }}>GitHub · {embed.kindLabel}</div>
          <div style={{ fontSize: 11, color: "#8892A4", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{url.replace("https://github.com/", "")}</div>
        </div>
      </a>
    );
  }

  // Generic OG card
  if (!og) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
        style={{ display: "block", fontSize: 12, color: "#1E88E5", textDecoration: "underline", marginBottom: 8, wordBreak: "break-all" }}>
        🔗 {url}
      </a>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
      style={{ display: "flex", flexDirection: "column", background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, overflow: "hidden", textDecoration: "none", margin: "4px 0 8px" }}>
      {og.image && <img src={og.image} alt="" style={{ width: "100%", maxHeight: 220, objectFit: "cover" }} />}
      <div style={{ padding: "8px 10px" }}>
        <div style={{ fontSize: 10, color: "#8892A4", textTransform: "uppercase", letterSpacing: 0.5 }}>{og.siteName || new URL(url).hostname}</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5", marginTop: 2 }}>{og.title}</div>
        {og.description && <div style={{ fontSize: 11, color: "#8892A4", marginTop: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{og.description}</div>}
      </div>
    </a>
  );
}
