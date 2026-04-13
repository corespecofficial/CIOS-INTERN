import { supabase, supabaseAdmin } from "@/lib/db";
import { DEFAULT_WEIGHTS, type Weights } from "@/lib/performance-shared";

export { DEFAULT_WEIGHTS, grade } from "@/lib/performance-shared";
export type { Weights, PersonalMetrics, TeamMember } from "@/lib/performance-shared";

export async function getWeights(): Promise<Weights> {
  try {
    const { data } = await supabaseAdmin().from("system_settings").select("value").eq("key", "performance.weights").maybeSingle();
    if (!data?.value) return DEFAULT_WEIGHTS;
    const parsed = JSON.parse(data.value) as Partial<Weights>;
    return { ...DEFAULT_WEIGHTS, ...parsed };
  } catch { return DEFAULT_WEIGHTS; }
}

export async function setWeights(w: Partial<Weights>, actorId: string): Promise<void> {
  const current = await getWeights();
  const merged = { ...current, ...w };
  await supabaseAdmin().from("system_settings").upsert({
    key: "performance.weights",
    value: JSON.stringify(merged),
    updated_by: actorId,
    updated_at: new Date().toISOString(),
  });
}

export async function computePersonalMetrics(userId: string, weights: Weights): Promise<PersonalMetrics> {
  const sb = supabase();
  // Each query resolves to a safe shape on failure so one missing column/table can't crash the page.
  const safe = async <T,>(p: PromiseLike<T>, fallback: T): Promise<T> => {
    try { return await p; } catch { return fallback; }
  };
  const [user, enrolls, tasksData, attendData, classCountRes, finesRes, txsData, commentsData, postsData, quizData] = await Promise.all([
    safe(sb.from("users").select("xp, streak, level, performance, reputation, wallet_balance").eq("id", userId).single(), { data: null } as { data: { xp: number; streak: number; level: number; performance: number; reputation: number; wallet_balance: number } | null }),
    safe(sb.from("course_enrollments").select("progress, status, completed_modules").eq("user_id", userId), { data: [] } as { data: { progress: number; status: string }[] }),
    safe(sb.from("tasks").select("status, due_date, updated_at").eq("assigned_to", userId), { data: [] } as { data: { status: string; due_date: string; updated_at: string }[] }),
    safe(sb.from("attendance").select("session_id, joined_at").eq("user_id", userId), { data: [] } as { data: { session_id: string; joined_at: string }[] }),
    safe(sb.from("class_sessions").select("*", { count: "exact", head: true }), { count: 0 } as { count: number }),
    safe(sb.from("fines").select("status, amount").eq("user_id", userId), { data: [] } as { data: { status: string; amount: number }[] }),
    safe(sb.from("transactions").select("type, amount, created_at").eq("user_id", userId), { data: [] } as { data: { type: string; amount: number; created_at: string }[] }),
    safe(sb.from("comments").select("upvotes, downvotes, brilliant_label, is_solution, created_at").eq("author_id", userId).eq("is_deleted", false), { data: [] } as { data: { upvotes: number; brilliant_label: string | null; is_solution: boolean; created_at: string }[] }),
    safe(sb.from("posts").select("upvotes, downvotes, created_at").eq("author_id", userId).eq("is_deleted", false), { data: [] } as { data: { upvotes: number; created_at: string }[] }),
    safe(sb.from("quiz_attempts").select("score, passed").eq("user_id", userId), { data: [] } as { data: { score: number; passed: boolean }[] }),
  ]);
  void quizData;

  const u = user.data || { xp: 0, streak: 0, level: 1, performance: 0, reputation: 0, wallet_balance: 0 };
  const totalSessions = classCountRes.count || 0;
  const attended = attendData.data?.length || 0;
  const attendance = totalSessions > 0 ? Math.min(100, Math.round((attended / totalSessions) * 100)) : 75; // baseline if no classes yet

  const allTasks = tasksData.data || [];
  type T = { status: string; due_date: string; updated_at: string };
  const done = (allTasks as T[]).filter((t) => t.status === "approved" || t.status === "submitted").length;
  const tasksPct = allTasks.length > 0 ? Math.round((done / allTasks.length) * 100) : 0;

  const enrollments = (enrolls.data || []) as { progress: number; status: string }[];
  const courses = enrollments.length > 0
    ? Math.round(enrollments.reduce((s, e) => s + (e.progress || 0), 0) / enrollments.length)
    : 0;

  const comments = (commentsData.data || []) as { upvotes: number; brilliant_label: string | null; is_solution: boolean; created_at: string }[];
  const posts = (postsData.data || []) as { upvotes: number; created_at: string }[];
  // Community score: rep + helpful signals, capped
  const helpful = comments.filter((c) => c.brilliant_label || c.is_solution).length;
  const commUp = comments.reduce((s, c) => s + c.upvotes, 0) + posts.reduce((s, p) => s + p.upvotes, 0);
  const communityRaw = (u.reputation || 0) + helpful * 5 + commUp;
  const community = Math.min(100, Math.round(communityRaw * 0.6));

  // Consistency: active days in last 14
  const since = Date.now() - 14 * 86400000;
  const activeDays = new Set<string>();
  for (const t of allTasks as T[]) {
    const ts = new Date(t.updated_at).getTime();
    if (ts >= since) activeDays.add(new Date(ts).toISOString().slice(0, 10));
  }
  for (const c of comments) {
    const ts = new Date(c.created_at).getTime();
    if (ts >= since) activeDays.add(new Date(ts).toISOString().slice(0, 10));
  }
  for (const p of posts) {
    const ts = new Date(p.created_at).getTime();
    if (ts >= since) activeDays.add(new Date(ts).toISOString().slice(0, 10));
  }
  const consistency = Math.round((activeDays.size / 14) * 100);

  // Revenue contribution = credits earned, capped at 50k → 100 pts
  const txs = (txsData.data || []) as { type: string; amount: number }[];
  const credits = txs.filter((t) => t.type === "credit" || t.type === "reward").reduce((s, t) => s + Number(t.amount), 0);
  const revenue = Math.min(100, Math.round((credits / 50000) * 100));

  // Discipline (higher = better). Fines unpaid = penalty.
  const fines = (finesRes.data || []) as { status: string; amount: number }[];
  const unpaidCount = fines.filter((f) => f.status === "pending" || f.status === "overdue").length;
  const overdue = (allTasks as T[]).filter((t) => t.status !== "approved" && t.status !== "submitted" && new Date(t.due_date).getTime() < Date.now()).length;
  const penalty = unpaidCount * 15 + overdue * 5;
  const discipline = Math.max(0, 100 - penalty);

  // Weighted total
  const W = weights;
  const sum = W.attendance + W.tasks + W.courses + W.community + W.consistency + W.revenue + W.discipline;
  const total = Math.round(
    ((attendance * W.attendance) + (tasksPct * W.tasks) + (courses * W.courses) +
      (community * W.community) + (consistency * W.consistency) +
      (revenue * W.revenue) + (discipline * W.discipline)) / sum
  );

  // Weekly activity (last 14 days)
  const buckets = new Map<string, number>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const t of allTasks as T[]) {
    const k = new Date(t.updated_at).toISOString().slice(0, 10);
    if (buckets.has(k)) buckets.set(k, (buckets.get(k) || 0) + 1);
  }
  for (const c of comments) {
    const k = new Date(c.created_at).toISOString().slice(0, 10);
    if (buckets.has(k)) buckets.set(k, (buckets.get(k) || 0) + 1);
  }
  const weeklyActivity = Array.from(buckets.entries()).map(([date, count]) => ({ date, count }));

  // Skill radar
  const skillBreakdown = [
    { subject: "Attendance", score: attendance },
    { subject: "Tasks", score: tasksPct },
    { subject: "Courses", score: courses },
    { subject: "Community", score: community },
    { subject: "Consistency", score: consistency },
    { subject: "Discipline", score: discipline },
  ];

  // Attendance trend (last 4 weeks)
  const attendanceTrend: { week: string; rate: number }[] = [];
  for (let w = 3; w >= 0; w--) {
    const start = Date.now() - (w + 1) * 7 * 86400000;
    const end = Date.now() - w * 7 * 86400000;
    const wAttended = (attendData.data || []).filter((a: { joined_at: string }) => {
      const t = new Date(a.joined_at).getTime(); return t >= start && t < end;
    }).length;
    attendanceTrend.push({ week: `W${4 - w}`, rate: wAttended });
  }

  // Persist computed score
  try { await supabaseAdmin().from("users").update({ performance: total }).eq("id", userId); } catch {}

  return {
    userId,
    attendance, tasks: tasksPct, courses,
    community, consistency, revenue, discipline,
    total,
    xp: u.xp || 0, streak: u.streak || 0, level: u.level || 1, reputation: u.reputation || 0,
    weeklyActivity, skillBreakdown, attendanceTrend,
  };
}

/** ─────────────────────────────────────────────
 *  Team + org aggregations (for team leads + admins)
 *  ───────────────────────────────────────────── */

export async function getTeamMetrics(): Promise<{
  avgScore: number; totalMembers: number; active: number;
  topPerformers: TeamMember[]; lowActivity: TeamMember[];
  membersByScore: TeamMember[];
  attendanceAverage: number;
  taskCompletion: number;
}> {
  const sb = supabase();
  const { data: users } = await sb
    .from("users")
    .select("id, name, avatar_url, role, xp, streak, reputation, performance, status, last_seen")
    .in("role", ["intern", "team_lead"])
    .order("performance", { ascending: false });
  const members = (users || []) as Array<{ id: string; name: string; avatar_url: string | null; role: string; xp: number; streak: number; reputation: number; performance: number; status: string; last_seen: string | null }>;

  const active = members.filter((m) => m.last_seen && Date.now() - new Date(m.last_seen).getTime() < 7 * 86400000).length;
  const avgScore = members.length > 0 ? Math.round(members.reduce((s, m) => s + (m.performance || 0), 0) / members.length) : 0;
  const mapped: TeamMember[] = members.map((m) => ({
    id: m.id, name: m.name, avatarUrl: m.avatar_url, role: m.role,
    score: m.performance || 0, xp: m.xp || 0, streak: m.streak || 0, reputation: m.reputation || 0, status: m.status,
  }));

  // Attendance average
  const [attendRes, sessionCountRes, tasksStatRes] = await Promise.all([
    sb.from("attendance").select("user_id"),
    sb.from("class_sessions").select("*", { count: "exact", head: true }),
    sb.from("tasks").select("status, assigned_to").in("assigned_to", members.map((m) => m.id)),
  ]);
  const totalClasses = sessionCountRes.count || 0;
  const attendanceByUser = new Map<string, number>();
  for (const a of (attendRes.data || []) as { user_id: string }[]) {
    attendanceByUser.set(a.user_id, (attendanceByUser.get(a.user_id) || 0) + 1);
  }
  const attendanceAverage = totalClasses > 0 && members.length > 0
    ? Math.round((Array.from(attendanceByUser.values()).reduce((s, n) => s + n, 0) / (totalClasses * members.length)) * 100)
    : 0;

  const tasks = (tasksStatRes.data || []) as { status: string; assigned_to: string }[];
  const doneTasks = tasks.filter((t) => t.status === "approved" || t.status === "submitted").length;
  const taskCompletion = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0;

  return {
    avgScore, totalMembers: members.length, active,
    topPerformers: mapped.slice(0, 5),
    lowActivity: mapped.filter((m) => m.score < 40).slice(0, 5),
    membersByScore: mapped,
    attendanceAverage, taskCompletion,
  };
}

export async function getOrgMetrics(): Promise<{
  totalUsers: number; activeWeek: number; activeMonth: number;
  retentionPct: number; churnPct: number;
  courseCompletions: number; totalRevenue: number;
  finesCollected: number; rewardsIssued: number;
  usersByRole: { role: string; count: number }[];
  growthTrend: { date: string; total: number }[];
}> {
  const sb = supabase();
  const [usersRes, txRes] = await Promise.all([
    sb.from("users").select("id, role, last_seen, created_at, status"),
    sb.from("transactions").select("type, amount, created_at"),
  ]);
  const users = (usersRes.data || []) as Array<{ id: string; role: string; last_seen: string | null; created_at: string; status: string }>;
  const nowMs = Date.now();
  const activeWeek = users.filter((u) => u.last_seen && nowMs - new Date(u.last_seen).getTime() < 7 * 86400000).length;
  const activeMonth = users.filter((u) => u.last_seen && nowMs - new Date(u.last_seen).getTime() < 30 * 86400000).length;
  const totalUsers = users.length;
  const retention = totalUsers > 0 ? Math.round((activeMonth / totalUsers) * 100) : 0;
  const churn = 100 - retention;

  const roles = new Map<string, number>();
  for (const u of users) roles.set(u.role, (roles.get(u.role) || 0) + 1);
  const usersByRole = Array.from(roles.entries()).map(([role, count]) => ({ role, count }));

  // Growth trend (last 30 days cumulative)
  const growthMap = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(nowMs - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    growthMap.set(key, 0);
  }
  for (const u of users) {
    const k = new Date(u.created_at).toISOString().slice(0, 10);
    if (growthMap.has(k)) growthMap.set(k, (growthMap.get(k) || 0) + 1);
  }
  let running = totalUsers - Array.from(growthMap.values()).reduce((s, n) => s + n, 0);
  const growthTrend = Array.from(growthMap.entries()).map(([date, n]) => {
    running += n;
    return { date, total: running };
  });

  const { count: completions } = await sb.from("course_enrollments").select("*", { count: "exact", head: true }).eq("status", "completed");
  const txs = (txRes.data || []) as { type: string; amount: number | string; created_at: string }[];
  const totalRevenue = txs.filter((t) => t.type === "payment" || t.type === "fine").reduce((s, t) => s + Number(t.amount), 0);
  const finesCollected = txs.filter((t) => t.type === "fine").reduce((s, t) => s + Number(t.amount), 0);
  const rewardsIssued = txs.filter((t) => t.type === "reward").reduce((s, t) => s + Number(t.amount), 0);

  return {
    totalUsers, activeWeek, activeMonth,
    retentionPct: retention, churnPct: churn,
    courseCompletions: completions || 0,
    totalRevenue, finesCollected, rewardsIssued,
    usersByRole, growthTrend,
  };
}
