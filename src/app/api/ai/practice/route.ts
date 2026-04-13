import { NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/db";
import { callLLM, logAiUsage } from "@/lib/ai-client";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const me = await getCurrentDbUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const content: string = (body?.content || "").toString().slice(0, 8000);
  const count: number = Math.min(10, Math.max(1, Number(body?.count) || 5));
  if (!content.trim()) return NextResponse.json({ error: "empty content" }, { status: 400 });

  try {
    const r = await callLLM(
      `Based on this lesson content, generate ${count} high-quality practice questions with clear, instructive answers. Mix conceptual and applied questions. Return as a numbered list, each question followed by "Answer:" on a new line.\n\nLESSON CONTENT:\n${content}`,
      { maxTokens: 1200, temperature: 0.5 }
    );
    await logAiUsage(me.id, "practice", r.provider);
    return NextResponse.json({ text: r.text, provider: r.provider, model: r.model });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
