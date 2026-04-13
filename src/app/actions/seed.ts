"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function requireSuperAdmin() {
  const { userId, sessionClaims } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const claimsMeta = (sessionClaims?.publicMetadata as Record<string, unknown> | undefined) || {};
  if (claimsMeta.role === "super_admin") return userId;
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  if (user.publicMetadata?.role !== "super_admin") throw new Error("Forbidden — super admin only");
  return userId;
}

type SeedResult = {
  ok: boolean;
  error?: string;
  stats?: {
    users: number;
    tasks: number;
    transactions: number;
    notifications: number;
    courses: number;
    enrollments: number;
  };
};

const SAMPLE_TASKS = [
  { title: "Submit weekly report", priority: "high", status: "pending", xp: 100, offsetHours: 24 },
  { title: "Complete AI Ethics module 3", priority: "medium", status: "in_progress", xp: 150, offsetHours: 48 },
  { title: "Peer review: design sprint", priority: "medium", status: "pending", xp: 80, offsetHours: 72 },
  { title: "Attend morning standup", priority: "low", status: "approved", xp: 30, offsetHours: -4 },
  { title: "Pay outstanding fine", priority: "urgent", status: "pending", xp: 0, offsetHours: 12 },
  { title: "Upload portfolio project", priority: "high", status: "submitted", xp: 200, offsetHours: -24 },
  { title: "Watch intro to prompt engineering", priority: "low", status: "approved", xp: 50, offsetHours: -72 },
];

const SAMPLE_TRANSACTIONS = [
  { type: "credit", amount: 10000, description: "Weekly stipend" },
  { type: "fine", amount: -2500, description: "Late submission penalty" },
  { type: "reward", amount: 5000, description: "Top performer bonus" },
  { type: "credit", amount: 3000, description: "Referral reward" },
  { type: "payment", amount: -15000, description: "Advanced React course" },
];

const SAMPLE_NOTIFICATIONS = [
  { title: "Welcome to CIOS", message: "Start your internship journey today!", type: "success" },
  { title: "New task assigned", message: "You have a new task due in 24 hours.", type: "task" },
  { title: "Payment received", message: "Your weekly stipend of ₦10,000 has been credited.", type: "info" },
];

// Courses are now created by real instructors through /instructor/create-course.
// The seeder no longer inserts demo courses — keeps the catalog authentic.

export async function seedDemoData(): Promise<SeedResult> {
  try {
    await requireSuperAdmin();
    const sb = supabaseAdmin();

    // 1. Fetch all existing Supabase users
    const { data: users, error: uErr } = await sb.from("users").select("id, clerk_id, role, name, email");
    if (uErr || !users || users.length === 0) {
      return { ok: false, error: "No users found. Ensure at least one user has signed in first." };
    }

    const stats = { users: users.length, tasks: 0, transactions: 0, notifications: 0, courses: 0, enrollments: 0 };

    const firstSuperAdmin = users.find((u) => u.role === "super_admin") || users[0];
    void firstSuperAdmin; // referenced below for task assignment

    // 2. Bump each user's profile fields (xp, streak, wallet, performance) so dashboards look alive
    for (const u of users) {
      const isInternish = u.role === "intern" || u.role === "team_lead";
      await sb
        .from("users")
        .update({
          xp: isInternish ? Math.floor(Math.random() * 5000) + 1000 : 0,
          streak: isInternish ? Math.floor(Math.random() * 30) + 1 : 0,
          level: isInternish ? Math.floor(Math.random() * 15) + 5 : 1,
          performance: isInternish ? Math.floor(Math.random() * 35) + 55 : 100,
          wallet_balance: isInternish ? Math.floor(Math.random() * 50000) + 10000 : 0,
          last_seen: new Date().toISOString(),
        })
        .eq("id", u.id);
    }

    // 3. Enrollments only auto-apply to courses that actually exist (created by real instructors).
    const { data: existingCourses } = await sb.from("courses").select("id").limit(20);
    const courseIds: string[] = (existingCourses || []).map((c) => c.id);

    // 4. Seed per-user data: tasks, transactions, notifications, enrollments
    for (const u of users) {
      const isInternish = u.role === "intern" || u.role === "team_lead";
      if (!isInternish) continue;

      // Tasks
      for (const t of SAMPLE_TASKS) {
        const dueDate = new Date(Date.now() + t.offsetHours * 3600 * 1000).toISOString();
        const { error } = await sb.from("tasks").insert({
          title: t.title,
          description: `Demo task for ${u.name}`,
          assigned_to: u.id,
          assigned_by: firstSuperAdmin.id,
          status: t.status,
          priority: t.priority,
          due_date: dueDate,
          xp_reward: t.xp,
        });
        if (!error) stats.tasks++;
      }

      // Transactions
      let runningBalance = 0;
      for (const tx of SAMPLE_TRANSACTIONS) {
        runningBalance += tx.amount;
        const { error } = await sb.from("transactions").insert({
          user_id: u.id,
          type: tx.type,
          amount: Math.abs(tx.amount),
          description: tx.description,
          balance_after: Math.max(0, runningBalance),
        });
        if (!error) stats.transactions++;
      }

      // Notifications
      for (const n of SAMPLE_NOTIFICATIONS) {
        const { error } = await sb.from("notifications").insert({
          user_id: u.id,
          title: n.title,
          message: n.message,
          type: n.type,
        });
        if (!error) stats.notifications++;
      }

      // Enroll in first 2 courses
      for (const cid of courseIds.slice(0, 2)) {
        const { error } = await sb.from("course_enrollments").insert({
          user_id: u.id,
          course_id: cid,
          progress: Math.floor(Math.random() * 80),
          status: "active",
        });
        if (!error) stats.enrollments++;
      }
    }

    revalidatePath("/dashboard");
    revalidatePath("/tasks");
    revalidatePath("/wallet");
    revalidatePath("/analytics");

    return { ok: true, stats };
  } catch (e) {
    console.error("[seedDemoData] error:", e);
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Seeds a fully-playable sample course (YouTube lesson + quiz + assignment)
 * attributed to the current user as instructor. Useful to demo the LMS end-to-end.
 */
export async function seedSampleCourse(): Promise<SeedResult & { courseId?: string }> {
  try {
    await requireSuperAdmin();
    const { userId } = await auth();
    if (!userId) return { ok: false, error: "Not signed in" };
    const sb = supabaseAdmin();
    const { data: me } = await sb.from("users").select("id, name").eq("clerk_id", userId).single();
    if (!me) return { ok: false, error: "Your user row missing" };

    const { data: course, error: cErr } = await sb.from("courses").insert({
      title: "Intro to Prompt Engineering (Demo)",
      subtitle: "A 5-minute taste of the CIOS LMS — video + quiz + assignment",
      description: "This is an auto-seeded demo course. Watch the video, take the quiz, submit the assignment, and claim your certificate. Replace or delete this course once you're comfortable with the platform.",
      instructor_id: me.id,
      category: "AI",
      difficulty: "beginner",
      language: "English",
      duration_hours: 1,
      price_naira: 0,
      status: "published",
      published_at: new Date().toISOString(),
      tags: ["demo", "ai", "prompt", "beginner"],
      thumbnail_url: "https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png",
    }).select("id").single();
    if (cErr || !course) return { ok: false, error: cErr?.message || "Course insert failed" };

    const modules = [
      {
        title: "Watch: What is Prompt Engineering?",
        summary: "A short video introduction to prompting.",
        description: "Watch this quick YouTube intro, then move on to the quiz.",
        content_type: "video",
        youtube_id: "dOxUroR57xs", // OpenAI's "ChatGPT can now see, hear, and speak" promo (safe public)
        duration_minutes: 3,
        order_index: 0,
        is_free_preview: true,
        quiz_questions: [],
        pass_score: 60,
      },
      {
        title: "Quiz: Quick check",
        summary: "Three questions to lock in what you saw.",
        description: "Pass at 60% to continue.",
        content_type: "quiz",
        duration_minutes: 3,
        order_index: 1,
        is_free_preview: false,
        pass_score: 60,
        quiz_questions: [
          {
            id: "q1",
            text: "What is a 'prompt' in AI?",
            points: 1,
            options: [
              { id: "a", text: "The AI's response", correct: false },
              { id: "b", text: "The instruction or input you give the AI", correct: true },
              { id: "c", text: "A type of machine learning model", correct: false },
              { id: "d", text: "A programming language", correct: false },
            ],
          },
          {
            id: "q2",
            text: "Which of these usually help get better AI answers? (select all that apply)",
            points: 2,
            options: [
              { id: "a", text: "Being specific about what you want", correct: true },
              { id: "b", text: "Giving examples of the output format", correct: true },
              { id: "c", text: "Using ALL CAPS FOR EVERYTHING", correct: false },
              { id: "d", text: "Providing relevant context", correct: true },
            ],
          },
          {
            id: "q3",
            text: "True or False: Adding 'step by step' to a prompt often improves reasoning.",
            points: 1,
            options: [
              { id: "a", text: "True", correct: true },
              { id: "b", text: "False", correct: false },
            ],
          },
        ],
      },
      {
        title: "Assignment: Write your first prompt",
        summary: "Apply what you learned.",
        description: "Submit a prompt you've written. Attach a screenshot of the AI's response if you have one.",
        content_type: "assignment",
        duration_minutes: 10,
        order_index: 2,
        is_free_preview: false,
        assignment_prompt: "Write a detailed prompt that asks an AI to help you plan a 3-day solo trip to a Nigerian city of your choice. Include: (1) the destination, (2) your budget in Naira, (3) what kind of experience you want (food, culture, adventure, etc.), and (4) ask for a day-by-day itinerary in a specific format. Paste both your prompt AND the AI's response.",
        assignment_max_score: 100,
        quiz_questions: [],
        pass_score: 60,
      },
    ];

    let inserted = 0;
    for (const m of modules) {
      const { error: mErr } = await sb.from("course_modules").insert({
        course_id: course.id, ...m,
      });
      if (!mErr) inserted++;
    }
    await sb.from("courses").update({ total_modules: inserted }).eq("id", course.id);

    return { ok: true, courseId: course.id, stats: { users: 1, tasks: 0, transactions: 0, notifications: 0, courses: 1, enrollments: 0 } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Danger: wipes all demo data but preserves user rows */
export async function wipeDemoData(): Promise<SeedResult> {
  try {
    await requireSuperAdmin();
    const sb = supabaseAdmin();
    const SENTINEL = "00000000-0000-0000-0000-000000000000";
    // Children first (FK order). Silently skip tables that don't exist yet.
    const tables = [
      "poll_votes", "polls", "message_reactions", "messages", "chat_room_members", "chat_rooms",
      "contact_requests", "contact_permissions",
      "announcement_confirmations", "announcement_reads", "announcements",
      "community_comments", "community_post_reactions", "community_posts",
      "lesson_progress", "course_enrollments", "course_lessons", "course_modules", "courses",
      "calendar_events", "reminders", "alarms", "focus_sessions",
      "tasks", "transactions", "notifications",
      "status_views", "status_reactions", "statuses",
      "opportunity_applications", "opportunities",
      "certificates", "user_achievements", "user_badges", "user_missions", "streak_history",
      "support_tickets",
    ];
    let cleared = 0;
    for (const t of tables) {
      const { error } = await sb.from(t).delete().neq("id", SENTINEL);
      if (!error) cleared++;
    }
    // Reset user-level counters so dashboards start fresh
    await sb.from("users").update({ wallet_balance: 0, xp: 0, streak: 0 }).neq("id", SENTINEL);
    for (const p of ["/dashboard", "/messages", "/tasks", "/wallet", "/courses", "/announcements", "/community", "/calendar", "/notes", "/notifications", "/leaderboard", "/gamification", "/performance"]) revalidatePath(p);
    return { ok: true, stats: { users: cleared, tasks: 0, transactions: 0, notifications: 0, courses: 0, enrollments: 0 } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
