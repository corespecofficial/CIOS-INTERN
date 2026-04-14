"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { sendChat, type ChatMessage } from "@/app/actions/ai-chat";
import { getEngagementFeatures } from "@/app/actions/engagement-v2";
import { cached, cacheKey, TTL } from "@/lib/cache";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export interface BuddyMessage {
  id: string; role: "user" | "assistant"; content: string; created_at: string;
}

async function getOrCreateThread(userId: string, courseId: string): Promise<string> {
  const sb = supabaseAdmin();
  const { data: existing } = await sb.from("study_buddy_threads")
    .select("id").eq("user_id", userId).eq("course_id", courseId).maybeSingle();
  if (existing) return (existing as { id: string }).id;
  const { data } = await sb.from("study_buddy_threads")
    .insert({ user_id: userId, course_id: courseId }).select("id").single();
  return (data as { id: string }).id;
}

export async function getBuddyHistory(courseId: string): Promise<R<BuddyMessage[]>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const features = await getEngagementFeatures();
    if (!features.studyBuddy) return { ok: true, data: [] };
    const threadId = await getOrCreateThread(me.id, courseId);
    const sb = supabaseAdmin();
    const { data } = await sb.from("study_buddy_messages")
      .select("id, role, content, created_at").eq("thread_id", threadId)
      .order("created_at", { ascending: true }).limit(50);
    return { ok: true, data: (data || []) as BuddyMessage[] };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function sendBuddyMessage(courseId: string, userMessage: string): Promise<R<{ reply: string }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const features = await getEngagementFeatures();
    if (!features.studyBuddy) return { ok: false, error: "Study buddy disabled" };
    if (!userMessage.trim()) return { ok: false, error: "Say something" };

    const sb = supabaseAdmin();
    const threadId = await getOrCreateThread(me.id, courseId);

    // Course summary is cached for 1h — it changes very rarely vs. the
    // dozens of buddy messages a user might send per session.
    const ctx = await cached(cacheKey.courseContext(courseId), TTL.long, async () => {
      const [{ data: course }, { data: modules }] = await Promise.all([
        sb.from("courses").select("title, category, difficulty").eq("id", courseId).maybeSingle(),
        sb.from("course_modules").select("title, summary, content_type").eq("course_id", courseId).order("order_index").limit(30),
      ]);
      const c = course as { title: string; category: string; difficulty: string } | null;
      const modList = ((modules || []) as Array<{ title: string; summary: string; content_type: string }>)
        .map((m) => `- ${m.title} [${m.content_type}]${m.summary ? ": " + m.summary.slice(0, 120) : ""}`).join("\n");
      return {
        title: c?.title || "this course",
        difficulty: c?.difficulty || "",
        category: c?.category || "",
        modList: modList || "(no lessons yet)",
      };
    });
    // Per-thread history is fresh every call (writes happen here).
    const { data: history } = await sb.from("study_buddy_messages")
      .select("role, content").eq("thread_id", threadId).order("created_at", { ascending: true }).limit(16);
    const c = { title: ctx.title, category: ctx.category, difficulty: ctx.difficulty };
    const modList = ctx.modList;

    const system = `You are the AI Study Buddy for a CIOS intern taking "${c?.title || "this course"}" (${c?.difficulty || ""}, ${c?.category || ""}).
Course lessons:
${modList || "(no lessons yet)"}

Your job: answer the intern's questions about the course content, give hints when they're stuck (not full answers), motivate them, and suggest which lesson to revisit. Be concise (<120 words), warm, and a bit playful. Never invent lessons that aren't listed above.`;

    const priorTurns: ChatMessage[] = ((history || []) as Array<{ role: "user" | "assistant"; content: string }>)
      .map((h) => ({ role: h.role, content: h.content }));
    priorTurns.push({ role: "user", content: userMessage });

    const r = await sendChat({ toolId: "chat", messages: priorTurns, system, maxTokens: 500 });
    if (!r.ok) return { ok: false, error: r.error };

    await sb.from("study_buddy_messages").insert([
      { thread_id: threadId, role: "user", content: userMessage.trim() },
      { thread_id: threadId, role: "assistant", content: r.data!.reply },
    ]);

    return { ok: true, data: { reply: r.data!.reply } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}
