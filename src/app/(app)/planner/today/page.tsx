import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

const PRIORITY_COLOR: Record<string, string> = { low: "#8892A4", normal: "#1E88E5", high: "#FFC107", urgent: "#EF5350" };

export default async function PlannerPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 86400000);
  const admin = supabaseAdmin();

  const [tasksRes, events, reminders, alarms, productivityLog] = await Promise.all([
    admin.from("tasks").select("id, title, status, due_date, priority").eq("assigned_to", me.id).lte("due_date", tomorrow.toISOString()).neq("status", "approved").order("due_date").then((r) => r.data || []).catch(() => []),
    admin.from("calendar_events").select("id, title, starts_at, ends_at, category").gte("starts_at", today.toISOString()).lt("starts_at", tomorrow.toISOString()).order("starts_at").then((r) => r.data || []).catch(() => []),
    admin.from("reminders").select("id, title, due_at, priority, done_at").eq("user_id", me.id).gte("due_at", today.toISOString()).lt("due_at", tomorrow.toISOString()).is("done_at", null).order("due_at").then((r) => r.data || []).catch(() => []),
    admin.from("alarms").select("id, label, time_of_day, active, days_of_week").eq("user_id", me.id).eq("active", true).order("time_of_day").then((r) => r.data || []).catch(() => []),
    admin.from("productivity_logs").select("*").eq("user_id", me.id).eq("day", today.toISOString().slice(0, 10)).maybeSingle().then((r) => r.data).catch(() => null),
  ]);

  const dayOfWeek = today.getDay();
  const todaysAlarms = (alarms as Array<{ id: string; label: string; time_of_day: string; days_of_week: number[] }>).filter((a) => a.days_of_week.length === 0 || a.days_of_week.includes(dayOfWeek));

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ marginBottom: 16 }}>
        <span style={{ display: "inline-block", padding: "3px 10px", background: "rgba(171,71,188,0.15)", color: "#AB47BC", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 6 }}>DAILY PLANNER</span>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>📆 {today.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 20 }}>
        <Stat label="Events"       value={events.length}      color="#1E88E5" href="/calendar" />
        <Stat label="Tasks due"    value={tasksRes.length}    color="#FFC107" href="/tasks" />
        <Stat label="Reminders"    value={reminders.length}   color="#FF7043" href="/reminders" />
        <Stat label="Alarms today" value={todaysAlarms.length} color="#AB47BC" href="/alarms" />
        <Stat label="Pomodoros"    value={(productivityLog?.pomodoros || 0) as number} color="#66BB6A" href="/focus-mode" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <section style={panel}>
          <h2 style={sectionHeader}>📅 Today's events</h2>
          {events.length === 0 && <Empty text="No events scheduled." />}
          {(events as Array<{ id: string; title: string; starts_at: string; category: string }>).map((e) => (
            <Link key={e.id} href={`/calendar`} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", textDecoration: "none", color: "#E8EDF5" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{e.title}</div>
                <div style={{ fontSize: 10, color: "#8892A4" }}>{e.category}</div>
              </div>
              <div style={{ fontSize: 12, color: "#1E88E5", fontFamily: "'Space Grotesk', sans-serif" }}>
                {new Date(e.starts_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
              </div>
            </Link>
          ))}
        </section>

        <section style={panel}>
          <h2 style={sectionHeader}>✅ Tasks due</h2>
          {tasksRes.length === 0 && <Empty text="All caught up!" />}
          {(tasksRes as Array<{ id: string; title: string; priority: string; due_date: string }>).map((t) => (
            <Link key={t.id} href="/tasks" style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", textDecoration: "none", color: "#E8EDF5" }}>
              <div style={{ fontSize: 13 }}>{t.title}</div>
              <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: `${PRIORITY_COLOR[t.priority] || "#8892A4"}22`, color: PRIORITY_COLOR[t.priority] || "#8892A4", textTransform: "uppercase" }}>{t.priority}</span>
            </Link>
          ))}
        </section>

        <section style={panel}>
          <h2 style={sectionHeader}>🔔 Reminders</h2>
          {reminders.length === 0 && <Empty text="Nothing to remember today." />}
          {(reminders as Array<{ id: string; title: string; due_at: string; priority: string }>).map((r) => (
            <Link key={r.id} href="/reminders" style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", textDecoration: "none", color: "#E8EDF5" }}>
              <div style={{ fontSize: 13 }}>{r.title}</div>
              <div style={{ fontSize: 11, color: "#8892A4", fontFamily: "'Space Grotesk', sans-serif" }}>{new Date(r.due_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</div>
            </Link>
          ))}
        </section>

        <section style={panel}>
          <h2 style={sectionHeader}>⏰ Alarms today</h2>
          {todaysAlarms.length === 0 && <Empty text="No alarms set for today." />}
          {todaysAlarms.map((a) => (
            <Link key={a.id} href="/alarms" style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", textDecoration: "none", color: "#E8EDF5" }}>
              <div style={{ fontSize: 13 }}>{a.label || "(no label)"}</div>
              <div style={{ fontSize: 16, fontWeight: 300, color: "#AB47BC", fontFamily: "'Space Grotesk', sans-serif" }}>{a.time_of_day.slice(0, 5)}</div>
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, color, href }: { label: string; value: number; color: string; href: string }) {
  return (
    <Link href={href} style={{ background: "#111827", border: `1px solid ${color}33`, borderRadius: 12, padding: 14, textDecoration: "none", display: "block" }}>
      <div style={{ fontSize: 10, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color, fontFamily: "'Space Grotesk', sans-serif", marginTop: 4 }}>{value}</div>
    </Link>
  );
}

function Empty({ text }: { text: string }) { return <div style={{ fontSize: 12, color: "#8892A4", padding: 6 }}>{text}</div>; }

const panel: React.CSSProperties = { background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 };
const sectionHeader: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#8892A4", letterSpacing: 1, textTransform: "uppercase", margin: "0 0 10px 0" };
