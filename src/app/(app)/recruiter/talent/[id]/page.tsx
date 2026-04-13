import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicProfile } from "@/lib/db";
import { TalentShareButton } from "./talent-share-button";

export const dynamic = "force-dynamic";

export default async function RecruiterTalentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getPublicProfile(id);
  if (!p) notFound();

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      {/* Verified badge banner */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, padding: "10px 16px", background: "linear-gradient(135deg, rgba(38,198,218,0.15), rgba(102,187,106,0.08))", border: "1px solid rgba(38,198,218,0.25)", borderRadius: 12 }}>
        <span style={{ fontSize: 22 }}>✅</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#26C6DA" }}>Verified CIOS talent</div>
          <div style={{ fontSize: 11, color: "#8892A4" }}>Performance, attendance, and skill records authenticated by COSPRONOS Media × Corespec.</div>
        </div>
      </div>

      {/* Hero card */}
      <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 24, marginBottom: 16, display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
        {p.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.avatar_url} alt={p.name} width={96} height={96} style={{ borderRadius: "50%", objectFit: "cover", border: "3px solid rgba(30,136,229,0.35)" }} />
        ) : (
          <div style={{ width: 96, height: 96, borderRadius: "50%", background: "linear-gradient(135deg, #1E88E5, #AB47BC)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 800, color: "#fff" }}>
            {(p.name || "?").split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase()}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>{p.name}</h1>
          {p.headline && <div style={{ fontSize: 14, color: "#8892A4", marginTop: 4 }}>{p.headline}</div>}
          {p.location && <div style={{ fontSize: 12, color: "#5A6478", marginTop: 4 }}>📍 {p.location}</div>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
          <TalentShareButton id={id} name={p.name} />
          <Link href={`/messages?to=${id}`} style={{ padding: "10px 18px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>💬 Contact</Link>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 16 }}>
        <Stat label="XP" value={p.xp.toLocaleString()} color="#FFC107" />
        <Stat label="Level" value={p.level.toString()} color="#1E88E5" />
        <Stat label="Streak" value={`${p.streak}d`} color="#FF7043" />
        <Stat label="Performance" value={`${p.performance}%`} color="#66BB6A" />
        <Stat label="Reputation" value={p.reputation.toString()} color="#AB47BC" />
      </div>

      {/* Bio */}
      {p.bio && (
        <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 18, marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "#8892A4", marginBottom: 6 }}>ABOUT</div>
          <p style={{ fontSize: 14, color: "#E8EDF5", lineHeight: 1.6, margin: 0 }}>{p.bio}</p>
        </div>
      )}

      {/* Skills */}
      {p.skills.length > 0 && (
        <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 18, marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "#8892A4", marginBottom: 10 }}>SKILLS</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {p.skills.map((s: string) => (
              <span key={s} style={{ padding: "4px 12px", background: "rgba(30,136,229,0.12)", color: "#1E88E5", borderRadius: 99, fontSize: 12, fontWeight: 600 }}>{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Activity stats */}
      <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 18, marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "#8892A4", marginBottom: 10 }}>ACTIVITY</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px,1fr))", gap: 12 }}>
          <Mini label="Posts" value={p.postsCount?.toString() || "0"} />
          <Mini label="Comments" value={p.commentsCount?.toString() || "0"} />
          <Mini label="Courses" value={p.coursesCompleted?.toString() || "0"} />
          <Mini label="Certs" value={p.certificates?.toString() || "0"} />
        </div>
      </div>

      <Link href="/recruiter/talent-pool" style={{ display: "inline-block", padding: "10px 18px", background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "#E8EDF5", borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>← Back to talent pool</Link>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderLeft: `3px solid ${color}`, borderRadius: 12, padding: "12px 14px" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 800, color, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 800, color: "#E8EDF5" }}>{value}</div>
      <div style={{ fontSize: 10, color: "#5A6478", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 }}>{label}</div>
    </div>
  );
}
