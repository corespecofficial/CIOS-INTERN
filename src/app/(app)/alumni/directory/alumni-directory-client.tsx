"use client";

/* eslint-disable @next/next/no-img-element */
import { useState, useMemo } from "react";
import Link from "next/link";
import type { AlumniMember } from "@/app/actions/alumni";

const TRACKS = ["All Tracks", "Web Development", "UI/UX Design", "Digital Marketing", "Data Analytics", "Video Editing", "Copywriting", "AI & Automation", "Business Development"];

export function AlumniDirectoryClient({ alumni }: { alumni: AlumniMember[] }) {
  const [search, setSearch] = useState("");
  const [track, setTrack] = useState("All Tracks");
  const [sort, setSort] = useState<"recent" | "xp" | "performance">("recent");

  const filtered = useMemo(() => {
    let list = [...alumni];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) => (a.name || "").toLowerCase().includes(q));
    }
    if (track !== "All Tracks") {
      list = list.filter((a) => (a.role || "").toLowerCase().includes(track.toLowerCase()));
    }
    if (sort === "xp") list.sort((a, b) => b.xp - a.xp);
    else if (sort === "performance") list.sort((a, b) => b.performance - a.performance);
    else list.sort((a, b) => new Date(b.graduated_at).getTime() - new Date(a.graduated_at).getTime());
    return list;
  }, [alumni, search, track, sort]);

  const cohorts = useMemo(() => {
    const nums = alumni.map((a) => a.cohort_number).filter(Boolean) as number[];
    return [...new Set(nums)].sort((a, b) => b - a);
  }, [alumni]);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, rgba(255,193,7,0.12), rgba(255,112,67,0.06))",
        border: "1px solid rgba(255,193,7,0.25)",
        borderRadius: 20, padding: 28, marginBottom: 24,
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16,
      }}>
        <div>
          <Link href="/alumni" style={{ fontSize: 11, color: "#FFC107", fontWeight: 700, letterSpacing: 0.5, textDecoration: "none" }}>← ALUMNI HUB</Link>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#E8EDF5", margin: "4px 0 6px" }}>🌍 Graduate Directory</h1>
          <p style={{ fontSize: 13, color: "#8892A4", margin: 0 }}>Every CIOS graduate — a growing talent network shaping Africa's digital economy.</p>
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {[
            { val: alumni.length, label: "Total Graduates" },
            { val: cohorts.length, label: "Cohorts" },
          ].map(({ val, label }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#FFC107", fontFamily: "'Space Grotesk',sans-serif" }}>{val}</div>
              <div style={{ fontSize: 11, color: "#8892A4" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name…"
          style={{ flex: "1 1 200px", padding: "9px 14px", background: "#111827", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 13, outline: "none" }}
        />
        <select
          value={track}
          onChange={(e) => setTrack(e.target.value)}
          style={{ padding: "9px 12px", background: "#111827", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 13, cursor: "pointer" }}
        >
          {TRACKS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          style={{ padding: "9px 12px", background: "#111827", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 13, cursor: "pointer" }}
        >
          <option value="recent">Most Recent</option>
          <option value="xp">Most XP</option>
          <option value="performance">Top Performance</option>
        </select>
        <span style={{ fontSize: 12, color: "#8892A4", flexShrink: 0 }}>{filtered.length} graduate{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ padding: 60, textAlign: "center", color: "#8892A4", background: "#111827", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 14 }}>
          {alumni.length === 0 ? "No graduates yet. The first cohort is on its way! 🚀" : "No graduates match your search."}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
          {filtered.map((a) => <AlumniCard key={a.id} member={a} />)}
        </div>
      )}
    </div>
  );
}

function AlumniCard({ member: a }: { member: AlumniMember }) {
  const initials = (a.name || "?").charAt(0).toUpperCase();
  return (
    <Link
      href={`/profile/${a.id}`}
      style={{
        background: "#111827",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 14,
        padding: 18,
        textAlign: "center",
        textDecoration: "none",
        display: "block",
        transition: "border-color 0.15s, transform 0.15s",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,193,7,0.35)"; (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLAnchorElement).style.transform = "none"; }}
    >
      {a.avatar_url
        ? <img src={a.avatar_url} alt="" style={{ width: 60, height: 60, borderRadius: "50%", objectFit: "cover", margin: "0 auto 10px", display: "block" }} />
        : <span style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(255,193,7,0.15)", border: "2px solid rgba(255,193,7,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "#FFC107", margin: "0 auto 10px" }}>{initials}</span>
      }
      <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name || "Alumni"}</div>
      {a.cohort_number && (
        <div style={{ display: "inline-block", fontSize: 9, padding: "2px 8px", background: "rgba(255,193,7,0.1)", color: "#FFC107", borderRadius: 20, fontWeight: 700, marginBottom: 6, letterSpacing: 0.5 }}>
          COHORT {a.cohort_number}
        </div>
      )}
      <div style={{ fontSize: 10, color: "#8892A4", marginBottom: 10 }}>
        Graduated {new Date(a.graduated_at).toLocaleDateString("en", { month: "short", year: "numeric" })}
      </div>
      <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, padding: "3px 8px", background: "rgba(30,136,229,0.1)", borderRadius: 6, color: "#1E88E5", fontWeight: 700 }}>
          {(a.xp || 0).toLocaleString()} XP
        </span>
        <span style={{ fontSize: 10, padding: "3px 8px", background: "rgba(102,187,106,0.1)", borderRadius: 6, color: "#66BB6A", fontWeight: 700 }}>
          {a.performance || 0}%
        </span>
      </div>
    </Link>
  );
}
