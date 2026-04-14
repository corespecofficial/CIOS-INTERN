"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { createTeam, joinTeam, leaveTeam, type TeamRow, type TeamMember } from "@/app/actions/teams";

const EMOJIS = ["🔥","⚡","💎","🚀","🌟","🎯","🏆","⚔️","🛡","🐉","🦁","🦊","🐺","🐯","🦅"];
const COLORS = ["#1E88E5","#66BB6A","#FFC107","#FF7043","#AB47BC","#26C6DA","#EF5350","#E91E63"];

export function TeamsClient({ initialTeams, initialMine }: { initialTeams: TeamRow[]; initialMine: { team: TeamRow | null; members: TeamMember[] } }) {
  const [teams, setTeams] = useState(initialTeams);
  const [mine, setMine] = useState(initialMine);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [color, setColor] = useState(COLORS[0]);
  const [pending, start] = useTransition();

  const refresh = async () => {
    const res = await Promise.all([
      fetch("/api/teams-data").catch(() => null),
    ]);
    // We don't have an API route; easier to just reload.
    if (typeof window !== "undefined") window.location.reload();
    void res;
  };

  const onCreate = () => start(async () => {
    const r = await createTeam(name, emoji, color);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success(`Team "${name}" created 🎉`);
    refresh();
  });

  const onJoin = (teamId: string) => start(async () => {
    const r = await joinTeam(teamId);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Joined team");
    refresh();
  });

  const onLeave = () => start(async () => {
    if (!confirm("Leave your team? You can join another after.")) return;
    const r = await leaveTeam();
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Left team");
    setMine({ team: null, members: [] });
    refresh();
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {mine.team ? (
        <div style={{ background: `linear-gradient(135deg, ${mine.team.color}22, ${mine.team.color}08)`, border: `1px solid ${mine.team.color}44`, borderRadius: 14, padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <div style={{ fontSize: 40 }}>{mine.team.emoji}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "#8892A4", textTransform: "uppercase", letterSpacing: 1 }}>Your team</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: mine.team.color }}>{mine.team.name}</div>
              <div style={{ fontSize: 12, color: "#8892A4", marginTop: 2 }}>
                {mine.team.member_count} members · {mine.team.xp_week} XP this week
              </div>
            </div>
            <button onClick={onLeave} disabled={pending} style={btnGhost}>Leave</button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {mine.members.map((m) => (
              <div key={m.user_id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", background: "rgba(0,0,0,0.25)", borderRadius: 999 }}>
                {m.avatar_url ? (
                  <img src={m.avatar_url} alt="" width={22} height={22} style={{ borderRadius: "50%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: "linear-gradient(135deg,#1E88E5,#AB47BC)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 800 }}>
                    {(m.name || "?").slice(0, 2).toUpperCase()}
                  </div>
                )}
                <span style={{ fontSize: 12, color: "#E8EDF5", fontWeight: 600 }}>{m.name || "Member"}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#E8EDF5" }}>You&apos;re not in a team yet</div>
              <div style={{ fontSize: 12, color: "#8892A4", marginTop: 2 }}>Create your own or join an existing squad below.</div>
            </div>
            <button onClick={() => setShowCreate((v) => !v)} style={btnPrimary}>
              {showCreate ? "Cancel" : "+ Create team"}
            </button>
          </div>

          {showCreate && (
            <div style={{ marginTop: 14, padding: 14, background: "#0A0E1A", borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)" }}>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Team name" style={input} maxLength={32} />
              <div style={{ fontSize: 11, color: "#8892A4", margin: "12px 0 6px" }}>Emoji</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {EMOJIS.map((e) => (
                  <button key={e} onClick={() => setEmoji(e)} style={{ fontSize: 20, padding: 6, background: emoji === e ? "rgba(30,136,229,0.2)" : "transparent", border: `1px solid ${emoji === e ? "#1E88E5" : "rgba(255,255,255,0.08)"}`, borderRadius: 8, cursor: "pointer" }}>{e}</button>
                ))}
              </div>
              <div style={{ fontSize: 11, color: "#8892A4", margin: "12px 0 6px" }}>Color</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {COLORS.map((c) => (
                  <button key={c} onClick={() => setColor(c)} style={{ width: 32, height: 32, background: c, borderRadius: 8, border: color === c ? "2px solid #fff" : "2px solid transparent", cursor: "pointer" }} />
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
                <button onClick={onCreate} disabled={pending} style={btnPrimary}>Create team</button>
              </div>
            </div>
          )}
        </div>
      )}

      <div>
        <h3 style={{ fontSize: 14, fontWeight: 800, color: "#E8EDF5", margin: "0 0 10px" }}>🏆 Weekly leaderboard</h3>
        {teams.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "#8892A4", fontSize: 13, background: "#111827", borderRadius: 14, border: "1px dashed rgba(255,255,255,0.1)" }}>
            No teams yet. Be the first to create one.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {teams.map((t, i) => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, background: t.is_mine ? `${t.color}15` : "#111827", border: `1px solid ${t.is_mine ? t.color + "66" : "rgba(255,255,255,0.07)"}`, borderRadius: 12 }}>
                <div style={{ width: 32, textAlign: "center", fontSize: 15, fontWeight: 800, color: i < 3 ? "#FFC107" : "#8892A4" }}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                </div>
                <div style={{ fontSize: 28 }}>{t.emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: t.color }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: "#8892A4" }}>{t.member_count} member{t.member_count === 1 ? "" : "s"}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#FFC107", fontFamily: "'Space Grotesk', sans-serif" }}>{t.xp_week}</div>
                  <div style={{ fontSize: 9, color: "#8892A4", textTransform: "uppercase", letterSpacing: 1 }}>XP this week</div>
                </div>
                {!mine.team && (
                  <button onClick={() => onJoin(t.id)} disabled={pending} style={btnGhost}>Join</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const btnPrimary: React.CSSProperties = {
  padding: "9px 14px", background: "linear-gradient(135deg,#1E88E5,#1565C0)",
  color: "#fff", border: "none", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer",
};
const btnGhost: React.CSSProperties = {
  padding: "8px 14px", background: "transparent", color: "#E8EDF5",
  border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer",
};
const input: React.CSSProperties = {
  width: "100%", background: "#111827", border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 10, padding: "10px 14px", color: "#E8EDF5", fontSize: 13, outline: "none",
};
