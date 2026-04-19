import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { getMyDigest } from "@/app/actions/digest";

export const dynamic = "force-dynamic";

const C = {
  bg: "#0A0E1A",
  card: "#111827",
  text: "#E8EDF5",
  dim: "#8892A4",
  border: "rgba(255,255,255,0.08)",
};

function fmt(iso: string | null): string {
  if (!iso) return "No deadline";
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

export default async function DigestPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  const res = await getMyDigest();
  if (!res.ok) {
    return <div style={{ padding: 32, color: "#EF5350" }}>Failed to load: {res.error}</div>;
  }
  const d = res.data;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, padding: "24px 16px 80px", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "inline-block", background: "rgba(255,193,7,0.12)", border: "1px solid rgba(255,193,7,0.3)", padding: "4px 12px", borderRadius: 999, fontSize: 10, fontWeight: 700, letterSpacing: 2, color: "#FFC107", marginBottom: 12, textTransform: "uppercase" }}>
        ☀ Weekly Digest
      </div>
      <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>
        Good morning, {d.userName.split(" ")[0]} 👋
      </h1>
      <p style={{ margin: "6px 0 0", color: C.dim, fontSize: 13 }}>{d.weekLabel} · HG Core&apos;s read on your week.</p>

      {/* Headline */}
      <div style={{ marginTop: 24, padding: 22, background: `linear-gradient(135deg, rgba(30,136,229,0.08), rgba(102,187,106,0.04))`, border: `1px solid ${C.border}`, borderRadius: 14 }}>
        <div style={{ fontSize: 10, color: C.dim, letterSpacing: 2, textTransform: "uppercase", fontWeight: 700 }}>This week in one line</div>
        <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.3, marginTop: 8, letterSpacing: -0.3 }}>
          {d.highlight}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 20 }}>
        <StatBox label="Tasks" value={String(d.tasksCompleted)} color="#4DA8FF" />
        <StatBox label="Points" value={d.pointsEarned > 999 ? `${(d.pointsEarned / 1000).toFixed(1)}K` : String(d.pointsEarned)} color="#FFC107" />
        <StatBox label="Streak" value={`🔥 ${d.streak}`} color="#FF7043" />
        <StatBox label="Posts" value={String(d.postsMade)} color="#AB47BC" />
      </div>

      {/* Vs last week */}
      {d.rankDelta !== null && (
        <div style={{ marginTop: 16, padding: "12px 16px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13 }}>
          <span style={{ color: C.dim }}>Vs last week: </span>
          {d.rankDelta > 0 ? (
            <span style={{ color: "#4dd88b", fontWeight: 700 }}>+{d.rankDelta} pts ↑</span>
          ) : d.rankDelta < 0 ? (
            <span style={{ color: "#EF5350", fontWeight: 700 }}>{d.rankDelta} pts ↓</span>
          ) : (
            <span style={{ color: C.dim }}>Same pace</span>
          )}
        </div>
      )}

      {/* Top skill + Focus area */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>Top Skill This Week</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#4dd88b" }}>⚡ {d.topSkill}</div>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>Focus Area</div>
          <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>{d.focusArea}</div>
        </div>
      </div>

      {/* Next steps */}
      <div style={{ marginTop: 20 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 10px", color: C.text }}>This week&apos;s plays</h2>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
          <ol style={{ margin: 0, paddingLeft: 22, lineHeight: 1.9, color: C.text, fontSize: 13 }}>
            {d.nextSteps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </div>
      </div>

      {/* Upcoming tasks */}
      {d.upcomingTasks.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 10px", color: C.text }}>Due this week</h2>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
            {d.upcomingTasks.map((t, i) => (
              <div key={t.id} style={{ padding: "12px 16px", borderBottom: i < d.upcomingTasks.length - 1 ? `1px solid ${C.border}` : "none", display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{t.title}</div>
                <div style={{ fontSize: 11, color: C.dim }}>{fmt(t.due)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming events */}
      {d.upcomingEvents.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 10px", color: C.text }}>On your calendar</h2>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
            {d.upcomingEvents.map((e, i) => (
              <div key={e.id} style={{ padding: "12px 16px", borderBottom: i < d.upcomingEvents.length - 1 ? `1px solid ${C.border}` : "none", display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{e.title}</div>
                <div style={{ fontSize: 11, color: C.dim }}>{fmt(e.when)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 40, textAlign: "center", color: C.dim, fontSize: 11, lineHeight: 1.6 }}>
        Generated just for you · {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short", year: "numeric" })}<br />
        Coming soon: email delivery every Monday 8am.
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 10px", textAlign: "center" }}>
      <div style={{ fontSize: 9, color: C.dim, letterSpacing: 1, textTransform: "uppercase", fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color, marginTop: 4 }}>{value}</div>
    </div>
  );
}
