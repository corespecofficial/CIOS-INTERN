import { NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/db";
import { callLLM, logAiUsage } from "@/lib/ai-client";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const me = await getCurrentDbUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const content: string = (body?.content || "").toString().slice(0, 8000);
  if (!content.trim()) return NextResponse.json({ error: "empty content" }, { status: 400 });

  try {
    const r = await callLLM(
      `Summarize the following lesson content in 4-6 clear bullet points. Focus on key takeaways a student should remember.\n\nCONTENT:\n${content}`,
      { maxTokens: 500, temperature: 0.3 }
    );
    await logAiUsage(me.id, "summarize", r.provider);
    return NextResponse.json({ summary: r.text, provider: r.provider, model: r.model });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
