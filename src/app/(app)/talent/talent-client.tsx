"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useMemo, useState } from "react";
import { rankFromLevel } from "@/lib/gamification-shared";
import type { TalentRow } from "@/app/actions/talent";

export function TalentClient({ initial }: { initial: TalentRow[] }) {
  const [q, setQ] = useState("");
  const [skill, setSkill] = useState("");
  const [minLevel, setMinLevel] = useState(0);
  const [sort, setSort] = useState<"performance" | "xp" | "reputation" | "level">("performance");

  const filtered = useMemo(() => {
    const qq = q.toLowerCase();
    const sk = skill.toLowerCase();
    const list = initial.filter((u) => {
      if (qq && !(u.name.toLowerCase().includes(qq) || (u.headline || "").toLowerCase().includes(qq))) return false;
      if (sk && !(u.skills || []).some((s) => s.toLowerCase().includes(sk))) return false;
      if (minLevel && u.level < minLevel) return false;
      return true;
    });
    list.sort((a, b) => (b[sort] as number) - (a[sort] as number));
    return list;
  }, [initial, q, skill, minLevel, sort]);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg, rgba(171,71,188,0.15), rgba(30,136,229,0.05))", border: "1px solid rgba(171,71,188,0.25)", borderRadius: 16, padding: 22, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <span style={{ display: "inline-block", padding: "3px 10px", background: "rgba(171,71,188,0.15)", color: "#AB47BC", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 4 }}>TALENT POOL</span>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>🌟 Top CIOS interns & alumni</h1>
          <p style={{ fontSize: 13, color: "#8892A4", margin: "2px 0 0 0" }}>Discover verified talent ranked by real performance, XP, and reputation</p>
        </div>
        <Link href="/recruiter" style={btnPrimary}>← Recruiter portal</Link>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Search name or headline…" style={{ ...input, flex: 2, minWidth: 200 }} />
        <input value={skill} onChange={(e) => setSkill(e.target.value)} placeholder="Filter by skill (e.g. React, SEO)" style={{ ...input, flex: 1, minWidth: 160 }} />
        <select value={minLevel} onChange={(e) => setMinLevel(parseInt(e.target.value) || 0)} style={input}>
          <option value={0}>Any level</option><option value={3}>Level 3+</option><option value={5}>Level 5+</option>
          <option value={10}>Level 10+</option><option value={15}>Level 15+</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} style={input}>
          <option value="performance">Sort: Performance</option>
          <option value="xp">Sort: XP</option>
          <option value="reputation">Sort: Reputation</option>
          <option value="level">Sort: Level</option>
        </select>
      </div>

      {/* Results */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
        {filtered.length === 0 && <div style={{ gridColumn: "1/-1", padding: 40, textAlign: "center", color: "#8892A4", background: "#111827", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 14 }}>No talent matches these filters.</div>}
        {filtered.map((t, idx) => {
          const rank = rankFromLevel(t.level);
          const perfScore = Math.round(t.performance);
          const perfColor = perfScore >= 80 ? "#66BB6A" : perfScore >= 60 ? "#1E88E5" : perfScore >= 40 ? "#FFC107" : "#EF5350";
          return (
            <Link key={t.id} href={`/community/profile/${t.id}`} style={{
              background: "#111827", border: `1px solid ${rank.color}33`, borderRadius: 14, padding: 16,
              textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", gap: 10,
              transition: "transform 0.15s, border-color 0.15s",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ position: "relative" }}>
                  {t.avatar_url
                    ? <img src={t.avatar_url} alt="" style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", border: `2px solid ${rank.color}` }} />
                    : <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg, #1E88E5, #AB47BC)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700 }}>{t.name.slice(0, 1)}</div>}
                  {idx < 3 && <span style={{ position: "absolute", top: -4, right: -4, fontSize: 16 }}>{["🥇", "🥈", "🥉"][idx]}</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: "#8892A4", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.headline || t.role.replace("_", " ")}</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <Chip color={rank.color}>{rank.emoji} {rank.title}</Chip>
                <Chip color={perfColor}>📈 {perfScore}%</Chip>
                {t.badges_count > 0 && <Chip color="#FFC107">🏅 {t.badges_count}</Chip>}
              </div>

              {t.skills.length > 0 && (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {t.skills.slice(0, 5).map((s) => <span key={s} style={{ fontSize: 10, padding: "2px 7px", background: "rgba(255,255,255,0.05)", borderRadius: 4, color: "#8892A4" }}>{s}</span>)}
                  {t.skills.length > 5 && <span style={{ fontSize: 10, color: "#5A6478" }}>+{t.skills.length - 5}</span>}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#8892A4", marginTop: "auto", paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <span>Lv {t.level}</span>
                <span>{t.xp.toLocaleString()} XP</span>
                <span>⭐ {t.reputation}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Chip({ children, color }: { children: React.ReactNode; color: string }) {
  return <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: `${color}22`, color, fontWeight: 700 }}>{children}</span>;
}

const input: React.CSSProperties = { padding: "9px 12px", background: "#0A0E1A", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 };
const btnPrimary: React.CSSProperties = { padding: "9px 18px", background: "linear-gradient(135deg, #AB47BC, #8E24AA)", color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: "none", display: "inline-block" };
