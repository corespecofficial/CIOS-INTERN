"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { seedCommunity } from "@/app/actions/seed-community";

export function SeedClient() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ groupsCreated: number; welcomePostId: string | null } | null>(null);

  async function run() {
    if (!confirm("Seed the community with starter groups + pinned welcome post?")) return;
    setBusy(true);
    const r = await seedCommunity();
    setBusy(false);
    if (!r.ok) { toast.error(r.error); return; }
    setDone(r.data!);
    toast.success(`Seeded ${r.data!.groupsCreated} new groups`);
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "#E8EDF5", marginBottom: 10 }}>🌱 Seed community</h1>
      <p style={{ fontSize: 13, color: "#B0BEC5", lineHeight: 1.6, marginBottom: 16 }}>
        Creates the starter groups (<b>introductions</b>, <b>wins</b>, <b>help</b>, <b>ai-prompting</b>, <b>design</b>, <b>career</b>) and pins a welcome post in <b>#introductions</b>. Idempotent — safe to re-run; existing groups are left alone.
      </p>
      <button onClick={run} disabled={busy} style={{
        padding: "12px 22px",
        background: "linear-gradient(135deg,#66BB6A,#2E7D32)",
        color: "#fff", border: "none", borderRadius: 12,
        fontSize: 14, fontWeight: 800, cursor: busy ? "wait" : "pointer",
      }}>
        {busy ? "Seeding…" : "🌱 Seed community now"}
      </button>
      {done && (
        <div style={{ marginTop: 16, padding: 14, background: "rgba(102,187,106,0.1)", border: "1px solid rgba(102,187,106,0.3)", borderRadius: 12, color: "#E8EDF5", fontSize: 13 }}>
          ✓ {done.groupsCreated} new groups created.
          {done.welcomePostId && (
            <>
              {" "}
              <Link href={`/community/post/${done.welcomePostId}`} style={{ color: "#66BB6A", fontWeight: 700 }}>
                View welcome post →
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
