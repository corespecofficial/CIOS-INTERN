"use client";

import { useEffect, useState } from "react";

export default function SharedNotePage() {
  const [doc, setDoc] = useState<{ title: string; html: string; icon: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const hash = window.location.hash.slice(1);
      if (!hash) { setError("No document in link"); return; }
      const json = decodeURIComponent(escape(atob(hash)));
      setDoc(JSON.parse(json));
    } catch { setError("Could not decode this link"); }
  }, []);

  if (error) return <div style={{ padding: 40, color: "#EF5350", textAlign: "center", fontFamily: "'Nunito', sans-serif" }}>⚠ {error}</div>;
  if (!doc) return <div style={{ padding: 40, color: "#8892A4", textAlign: "center", fontFamily: "'Nunito', sans-serif" }}>Loading…</div>;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 20px", fontFamily: "'Nunito', sans-serif", color: "#E8EDF5" }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "rgba(38,198,218,0.15)", color: "#26C6DA", fontSize: 11, fontWeight: 700, borderRadius: 99, marginBottom: 14, letterSpacing: 0.5 }}>🔗 PUBLIC SHARE · READ-ONLY</div>
      <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 800, margin: "0 0 18px", display: "flex", alignItems: "center", gap: 10 }}>
        <span>{doc.icon}</span><span>{doc.title}</span>
      </h1>
      <article style={{ fontSize: 16, lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: doc.html }} />
      <div style={{ marginTop: 36, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.07)", fontSize: 11, color: "#5A6478", textAlign: "center" }}>
        Created with <strong>CIOS</strong> · COSPRONOS Internship Operating System
      </div>
    </div>
  );
}
