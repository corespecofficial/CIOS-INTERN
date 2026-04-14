/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin, getCurrentDbUser } from "@/lib/db";
import { getAllBadgesWithOwnership, levelProgress, rankFromLevel, formatXP } from "@/lib/gamification";
import { KudosButton } from "@/components/community/kudos-button";
import { TestimonialsSection } from "@/components/community/testimonials";

export const dynamic = "force-dynamic";

export default async function CommunityProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = supabaseAdmin();

  const { data: u } = await admin
    .from("users")
    .select("id, name, avatar_url, role, bio, headline, location, skills, xp, level, streak, reputation, created_at, intern_id")
    .eq("id", id)
    .maybeSingle();
  if (!u) notFound();
  const me = await getCurrentDbUser();

  const [postsRes, commentsRes, badges, coursesRes] = await Promise.all([
    admin.from("posts").select("id, title, upvotes, created_at").eq("author_id", id).eq("is_deleted", false).order("upvotes", { ascending: false }).limit(10),
    admin.from("comments").select("id, body, post_id, upvotes, brilliant_label, created_at").eq("author_id", id).eq("is_deleted", false).order("created_at", { ascending: false }).limit(10),
    getAllBadgesWithOwnership(id).catch(() => []),
    admin.from("enrollments")
      .select("progress, completed_at, courses:course_id (id, title)")
      .eq("user_id", id).not("completed_at", "is", null)
      .order("completed_at", { ascending: false }).limit(6),
  ]);
  type EnrollmentRow = { progress: number; completed_at: string | null; courses: { id: string; title: string } | { id: string; title: string }[] | null };
  const completedCourses = ((coursesRes.data || []) as EnrollmentRow[]).map((e) => {
    const c = Array.isArray(e.courses) ? e.courses[0] : e.courses;
    return c ? { id: c.id, title: c.title, completedAt: e.completed_at } : null;
  }).filter((x): x is { id: string; title: string; completedAt: string | null } => !!x);

  const earned = badges.filter((b) => !b.locked);
  const progress = levelProgress(u.xp || 0);
  const rank = rankFromLevel(u.level || 1);
  const joined = new Date(u.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short" });

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      {/* Hero */}
      <div style={{ background: `linear-gradient(135deg, ${rank.color}22, #111827)`, border: `1px solid ${rank.color}33`, borderRadius: 16, padding: 24, display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
        {u.avatar_url
          ? <img src={u.avatar_url} alt={u.name} style={{ width: 96, height: 96, borderRadius: "50%", objectFit: "cover", border: `3px solid ${rank.color}` }} />
          : <div style={{ width: 96, height: 96, borderRadius: "50%", background: "linear-gradient(135deg, #1E88E5, #AB47BC)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, fontWeight: 800 }}>{u.name.slice(0, 1)}</div>}
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: rank.color, marginBottom: 4 }}>{rank.emoji} {rank.title.toUpperCase()}</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>{u.name}</h1>
          {u.intern_id && <div style={{ fontSize: 11, color: "#1E88E5", fontFamily: "monospace", letterSpacing: 1, marginTop: 4 }}>🆔 {u.intern_id}</div>}
          <div style={{ fontSize: 13, color: "#8892A4", marginTop: 4 }}>
            {u.headline || u.role?.replace("_", " ")} {u.location && `· ${u.location}`} · Joined {joined}
          </div>
          {u.bio && <p style={{ fontSize: 13, color: "#E8EDF5", marginTop: 10, lineHeight: 1.6 }}>{u.bio}</p>}
          {Array.isArray(u.skills) && u.skills.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
              {(u.skills as string[]).slice(0, 12).map((s) => (
                <span key={s} style={{ fontSize: 10, padding: "3px 8px", background: "rgba(30,136,229,0.12)", color: "#1E88E5", border: "1px solid rgba(30,136,229,0.25)", borderRadius: 999, fontWeight: 700 }}>#{s}</span>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            <Stat label="Level" value={progress.level} />
            <Stat label="XP" value={formatXP(u.xp || 0)} />
            <Stat label="Streak" value={`${u.streak || 0}d`} />
            <Stat label="Reputation" value={u.reputation || 0} />
            <Stat label="Badges" value={earned.length} />
          </div>
          <div style={{ marginTop: 10 }}>
            <KudosButton userId={u.id} meId={me?.id || null} />
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Posts */}
        <section style={panel}>
          <h2 style={sectionHeader}>📝 Recent posts</h2>
          {(postsRes.data || []).length === 0 && <Empty text="No posts yet." />}
          {(postsRes.data || []).map((p) => (
            <Link key={p.id} href={`/community/post/${p.id}`} style={{ display: "block", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", textDecoration: "none" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#E8EDF5" }}>{p.title}</div>
              <div style={{ fontSize: 11, color: "#8892A4", marginTop: 2 }}>▲ {p.upvotes || 0} · {new Date(p.created_at).toLocaleDateString()}</div>
            </Link>
          ))}
        </section>

        {/* Comments */}
        <section style={panel}>
          <h2 style={sectionHeader}>💬 Recent comments</h2>
          {(commentsRes.data || []).length === 0 && <Empty text="No comments yet." />}
          {(commentsRes.data || []).map((c) => (
            <Link key={c.id} href={`/community/post/${c.post_id}`} style={{ display: "block", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", textDecoration: "none" }}>
              <div style={{ fontSize: 12, color: "#E8EDF5", lineHeight: 1.5 }}>
                {c.body.length > 140 ? c.body.slice(0, 140) + "…" : c.body}
              </div>
              <div style={{ fontSize: 11, color: "#8892A4", marginTop: 4 }}>
                ▲ {c.upvotes || 0} {c.brilliant_label && `· ${c.brilliant_label}`} · {new Date(c.created_at).toLocaleDateString()}
              </div>
            </Link>
          ))}
        </section>
      </div>

      {/* Completed courses */}
      {completedCourses.length > 0 && (
        <section style={{ ...panel, marginTop: 16 }}>
          <h2 style={sectionHeader}>🎓 Courses completed ({completedCourses.length})</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
            {completedCourses.map((c) => (
              <Link key={c.id} href={`/courses/${c.id}`} style={{ display: "block", background: "#0A0E1A", border: "1px solid rgba(102,187,106,0.2)", borderRadius: 10, padding: 12, textDecoration: "none" }}>
                <div style={{ fontSize: 10, color: "#66BB6A", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 }}>✓ Completed</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5", marginTop: 4 }}>{c.title}</div>
                {c.completedAt && <div style={{ fontSize: 10, color: "#8892A4", marginTop: 2 }}>{new Date(c.completedAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</div>}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Testimonials */}
      <div style={{ marginTop: 16 }}>
        <TestimonialsSection subjectId={u.id} meId={me?.id || null} subjectName={u.name} />
      </div>

      {/* Badges */}
      <section style={{ ...panel, marginTop: 16 }}>
        <h2 style={sectionHeader}>🎖️ Badges ({earned.length})</h2>
        {earned.length === 0 && <Empty text="No badges earned yet." />}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
          {earned.map((b) => (
            <div key={b.id} style={{ background: "#0A0E1A", border: "1px solid rgba(255,193,7,0.25)", borderRadius: 10, padding: 12, textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 4 }}>{b.icon_url || "🏆"}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#E8EDF5" }}>{b.name}</div>
              <div style={{ fontSize: 10, color: "#8892A4", marginTop: 2 }}>{b.description}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "6px 10px" }}>
      <div style={{ fontSize: 10, color: "#8892A4", letterSpacing: 0.4, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5" }}>{value}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div style={{ color: "#8892A4", fontSize: 12, padding: "10px 0" }}>{text}</div>;
}

const panel: React.CSSProperties = { background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 };
const sectionHeader: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase", margin: "0 0 10px 0" };
