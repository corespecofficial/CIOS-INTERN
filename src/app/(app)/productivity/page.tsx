import Link from "next/link";
import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const PRIORITY_COLOR: Record<string, string> = { low: "#8892A4", normal: "#1E88E5", high: "#FFC107", urgent: "#EF5350" };

export default async function ProductivityHubPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");

  const now = new Date();
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
  const tomorrow = new Date(startOfDay.getTime() + 86400000);
  const admin = supabaseAdmin();

  // Safe fetches — gracefully degrade
  const s = async <T,>(p: PromiseLike<T>, fb: T): Promise<T> => { try { return await p; } catch { return fb; } };

  const [
    tasksRes, eventsRes, remindersRes, alarmsRes, plansRes, noteRes, prodLogRes, pomRes,
  ] = await Promise.all([
    s(admin.from("tasks").select("id, title, status, due_date, priority").eq("assigned_to", me.id).neq("status", "approved").order("due_date").limit(5), { data: [] } as { data: Array<{ id: string; title: string; status: string; due_date: string; priority: string }> }),
    s(admin.from("calendar_events").select("id, title, start_time, color, type").gte("start_time", startOfDay.toISOString()).lte("start_time", tomorrow.toISOString()).order("start_time").limit(5), { data: [] } as { data: Array<{ id: string; title: string; start_time: string; color: string; type: string }> }),
    s(admin.from("reminders").select("id, title, due_at, priority").eq("user_id", me.id).is("done_at", null).gte("due_at", startOfDay.toISOString()).order("due_at").limit(5), { data: [] } as { data: Array<{ id: string; title: string; due_at: string; priority: string }> }),
    s(admin.from("alarms").select("id, label, time_of_day, days_of_week, active").eq("user_id", me.id).eq("active", true).order("time_of_day").limit(5), { data: [] } as { data: Array<{ id: string; label: string; time_of_day: string; days_of_week: number[]; active: boolean }> }),
    s(admin.from("plans").select("id, title, icon, color, status, due_at").eq("owner_id", me.id).eq("archived", false).order("sort_order").limit(5), { data: [] } as { data: Array<{ id: string; title: string; icon: string; color: string; status: string; due_at: string | null }> }),
    s(admin.from("notes").select("id, title, updated_at").eq("user_id", me.id).order("updated_at", { ascending: false }).limit(3), { data: [] } as { data: Array<{ id: string; title: string; updated_at: string }> }),
    s(admin.from("productivity_logs").select("pomodoros, focus_minutes, tasks_completed").eq("user_id", me.id).eq("day", startOfDay.toISOString().slice(0, 10)).maybeSingle(), { data: null } as { data: { pomodoros: number; focus_minutes: number; tasks_completed: number } | null }),
    s(admin.from("timer_sessions").select("kind, actual_seconds, completed, started_at").eq("user_id", me.id).gte("started_at", new Date(now.getTime() - 7 * 86400000).toISOString()), { data: [] } as { data: Array<{ kind: string; actual_seconds: number; completed: boolean; started_at: string }> }),
  ]);

  const dow = now.getDay();
  const todaysAlarms = alarmsRes.data.filter((a) => !a.days_of_week || a.days_of_week.length === 0 || a.days_of_week.includes(dow));
  const nextAlarm = todaysAlarms[0];

  const weekPomodoros = pomRes.data.filter((s) => s.kind === "pomodoro" && s.completed).length;
  const weekMinutes = pomRes.data.reduce((s, r) => s + Math.round((r.actual_seconds || 0) / 60), 0);
  const score = Math.min(100, Math.round((prodLogRes.data?.pomodoros || 0) * 15 + (prodLogRes.data?.tasks_completed || 0) * 8 + (prodLogRes.data?.focus_minutes || 0) / 5));

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, rgba(30,136,229,0.15), rgba(171,71,188,0.08))",
        border: "1px solid rgba(30,136,229,0.2)",
        borderRadius: 18, padding: "22px 26px", marginBottom: 18,
      }}>
        <span style={{ display: "inline-block", padding: "3px 10px", background: "rgba(30,136,229,0.18)", color: "#1E88E5", fontSize: 10, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 4 }}>PRODUCTIVITY HUB</span>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "2px 0", color: "#E8EDF5" }}>⚡ Command center</h1>
        <p style={{ fontSize: 13, color: "#8892A4", margin: 0 }}>
          Each widget previews live data · click any card to open the full page
        </p>
      </div>

      {/* Score strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 16 }}>
        <Metric label="Today score"    value={`${score}%`}                              color="#AB47BC" />
        <Metric label="Tasks today"    value={prodLogRes.data?.tasks_completed || 0}    color="#1E88E5" />
        <Metric label="Pomodoros (7d)" value={weekPomodoros}                             color="#66BB6A" />
        <Metric label="Focus min (7d)" value={weekMinutes}                               color="#FF7043" />
        <Metric label="Active alarms"  value={todaysAlarms.length}                       color="#FFC107" />
      </div>

      {/* Widgets */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
        {/* Calendar */}
        <Widget href="/calendar" title="🗓️ Calendar" subtitle={`${eventsRes.data.length} today`}>
          {eventsRes.data.length === 0 && <Empty>No events scheduled</Empty>}
          {eventsRes.data.map((e) => (
            <Row key={e.id} left={<span style={{ width: 6, height: 28, background: e.color, borderRadius: 2 }} />} right={new Date(e.start_time).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}>
              {e.title}
            </Row>
          ))}
        </Widget>

        {/* Tasks */}
        <Widget href="/tasks" title="✅ Tasks" subtitle={`${tasksRes.data.length} open`}>
          {tasksRes.data.length === 0 && <Empty>All caught up</Empty>}
          {tasksRes.data.map((t) => (
            <Row key={t.id} right={<span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 99, background: `${PRIORITY_COLOR[t.priority] || "#8892A4"}22`, color: PRIORITY_COLOR[t.priority] || "#8892A4", fontWeight: 700, textTransform: "uppercase" }}>{t.priority}</span>}>
              {t.title}
            </Row>
          ))}
        </Widget>

        {/* Planner */}
        <Widget href="/planner" title="📋 Planner" subtitle={`${plansRes.data.length} plans`}>
          {plansRes.data.length === 0 && <Empty>No active plans</Empty>}
          {plansRes.data.map((p) => (
            <Row key={p.id} left={<span style={{ fontSize: 16 }}>{p.icon}</span>} right={p.due_at ? new Date(p.due_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}>
              <span style={{ textDecoration: p.status === "completed" ? "line-through" : "none" }}>{p.title}</span>
            </Row>
          ))}
        </Widget>

        {/* Next alarm */}
        <Widget href="/alarms" title="⏰ Alarms & Clock" subtitle={nextAlarm ? `Next: ${nextAlarm.time_of_day?.slice(0, 5)}` : "None today"}>
          {todaysAlarms.length === 0 && <Empty>No alarms active today</Empty>}
          {todaysAlarms.map((a) => (
            <Row key={a.id} right={<span style={{ fontSize: 16, fontWeight: 300, color: "#AB47BC", fontFamily: "'Space Grotesk', sans-serif" }}>{a.time_of_day?.slice(0, 5)}</span>}>
              {a.label || "(no label)"}
            </Row>
          ))}
        </Widget>

        {/* Reminders */}
        <Widget href="/reminders" title="🔔 Reminders" subtitle={`${remindersRes.data.length} pending`}>
          {remindersRes.data.length === 0 && <Empty>Nothing to remember</Empty>}
          {remindersRes.data.map((r) => (
            <Row key={r.id} left={<span style={{ width: 4, height: 24, background: PRIORITY_COLOR[r.priority] || "#8892A4", borderRadius: 2 }} />} right={new Date(r.due_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}>
              {r.title}
            </Row>
          ))}
        </Widget>

        {/* Focus timer */}
        <Widget href="/focus-mode" title="🎯 Focus mode" subtitle={`${weekPomodoros} pomodoros this week`}>
          <div style={{ padding: "14px 4px", fontSize: 13, color: "#E8EDF5" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ color: "#8892A4" }}>This week</span>
              <span style={{ color: "#66BB6A", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800 }}>{weekMinutes} min</span>
            </div>
            <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ width: `${Math.min(100, (weekMinutes / 300) * 100)}%`, height: "100%", background: "linear-gradient(90deg, #1E88E5, #66BB6A)" }} />
            </div>
            <div style={{ fontSize: 11, color: "#5A6478", marginTop: 6 }}>Target: 5 hours / week</div>
          </div>
        </Widget>

        {/* Notes */}
        <Widget href="/notes" title="📝 Notes" subtitle={`${noteRes.data.length} recent`}>
          {noteRes.data.length === 0 && <Empty>No notes yet</Empty>}
          {noteRes.data.map((n) => (
            <Row key={n.id} right={new Date(n.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}>
              {n.title || "Untitled"}
            </Row>
          ))}
        </Widget>

        {/* Deadlines (combines task + plan + reminder due today) */}
        <Widget href="/planner/today" title="⚡ Today at a glance" subtitle="All deadlines">
          {(() => {
            const items: { key: string; label: string; time: string; color: string }[] = [];
            for (const t of tasksRes.data) if (t.due_date) items.push({ key: `t-${t.id}`, label: `✅ ${t.title}`, time: new Date(t.due_date).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }), color: PRIORITY_COLOR[t.priority] || "#8892A4" });
            for (const r of remindersRes.data) items.push({ key: `r-${r.id}`, label: `🔔 ${r.title}`, time: new Date(r.due_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }), color: PRIORITY_COLOR[r.priority] || "#FFC107" });
            for (const p of plansRes.data) if (p.due_at) items.push({ key: `p-${p.id}`, label: `${p.icon} ${p.title}`, time: new Date(p.due_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }), color: p.color });
            items.sort((a, b) => a.time.localeCompare(b.time));
            if (items.length === 0) return <Empty>No deadlines today</Empty>;
            return items.slice(0, 6).map((it) => (
              <Row key={it.key} left={<span style={{ width: 4, height: 22, background: it.color, borderRadius: 2 }} />} right={<span style={{ fontSize: 11, fontFamily: "'Space Grotesk', sans-serif", color: "#8892A4" }}>{it.time}</span>}>
                {it.label}
              </Row>
            ));
          })()}
        </Widget>
      </div>
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div style={{ background: "#111827", border: `1px solid ${color}33`, borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: 10, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color, fontFamily: "'Space Grotesk', sans-serif", marginTop: 4 }}>{value}</div>
    </div>
  );
}

function Widget({ href, title, subtitle, children }: { href: string; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <Link href={href} style={{
      background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16,
      textDecoration: "none", color: "inherit", display: "block", transition: "transform 0.15s, border-color 0.15s",
    }} className="productivity-widget">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, gap: 8 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5" }}>{title}</div>
          <div style={{ fontSize: 11, color: "#8892A4", marginTop: 2 }}>{subtitle}</div>
        </div>
        <span style={{ fontSize: 18, color: "#8892A4" }}>↗</span>
      </div>
      <div>{children}</div>
    </Link>
  );
}

function Row({ children, left, right }: { children: React.ReactNode; left?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      {left}
      <div style={{ flex: 1, fontSize: 13, color: "#E8EDF5", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{children}</div>
      {right && <div style={{ fontSize: 11, color: "#8892A4" }}>{right}</div>}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: "16px 6px", textAlign: "center", fontSize: 12, color: "#5A6478" }}>{children}</div>;
}
