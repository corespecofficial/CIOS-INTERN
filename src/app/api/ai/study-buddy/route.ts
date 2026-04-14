import { NextResponse } from "next/server";
import { callLLM } from "@/lib/ai-client";
import { getCurrentDbUser } from "@/lib/db";

export const runtime = "nodejs";

/** Lesson-aware Q&A. Posts { context, question } and returns a focused answer. */
export async function POST(req: Request) {
  const me = await getCurrentDbUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { context?: string; question?: string } | null = null;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const question = (body?.question || "").trim();
  const context = (body?.context || "").trim().slice(0, 6000);
  if (!question) return NextResponse.json({ error: "Question required" }, { status: 400 });

  try {
    const r = await callLLM(
      `LESSON CONTEXT (use as your primary reference, but you may add general knowledge when the lesson is silent):\n---\n${context || "(no lesson context provided)"}\n---\n\nSTUDENT QUESTION: ${question}\n\nAnswer concisely in 2–5 short paragraphs. If the answer requires steps, use a numbered list. End with one suggested follow-up question on a new line prefixed with "💡 Ask next:". Never invent citations.`,
      {
        system: "You are the CIOS Study Buddy — a warm, precise, Socratic tutor for interns.",
        maxTokens: 900, temperature: 0.4,
      }
    );
    return NextResponse.json({ text: r.text.trim() });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
