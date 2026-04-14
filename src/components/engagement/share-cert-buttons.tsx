"use client";

import { useState } from "react";
import toast from "react-hot-toast";

export function ShareCertButtons({ slug, courseTitle }: { slug: string; courseTitle: string }) {
  const [busy, setBusy] = useState(false);
  const url = typeof window !== "undefined"
    ? `${window.location.origin}/c/${slug}`
    : `/c/${slug}`;

  const shareText = `I just earned a CIOS certificate in "${courseTitle}". 🏆`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch { toast.error("Couldn't copy"); }
  };

  const native = async () => {
    if (!navigator.share) { copy(); return; }
    setBusy(true);
    try { await navigator.share({ title: "CIOS Certificate", text: shareText, url }); }
    catch { /* user cancelled */ }
    finally { setBusy(false); }
  };

  const linkedin = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
  const twitter = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`;
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(shareText + " " + url)}`;

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      <button onClick={native} disabled={busy} style={btn("#66BB6A")} title="Share">
        📤 Share
      </button>
      <a href={linkedin} target="_blank" rel="noreferrer" style={btn("#0A66C2")}>in</a>
      <a href={twitter} target="_blank" rel="noreferrer" style={btn("#1DA1F2")}>𝕏</a>
      <a href={whatsapp} target="_blank" rel="noreferrer" style={btn("#25D366")}>WA</a>
      <button onClick={copy} style={btn("#5A6478")}>🔗</button>
    </div>
  );
}

function btn(color: string): React.CSSProperties {
  return {
    padding: "7px 12px", background: color, color: "#fff",
    border: "none", borderRadius: 8, fontSize: 11, fontWeight: 700,
    cursor: "pointer", textDecoration: "none", display: "inline-block",
  };
}
