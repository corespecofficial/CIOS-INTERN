"use server";

import { getCurrentDbUser } from "@/lib/db";
import { callLLM } from "@/lib/ai-client";
import { checkAIAccess, logUsage } from "@/lib/ai-access";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

/** Summarise a document into an executive summary + key points. */
export async function summariseDocument(
  input: { text: string; style: "executive" | "bullets" | "tldr" },
): Promise<R<{ summary: string; bullets: string[] }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (input.text.trim().length < 80) return { ok: false, error: "Paste at least a paragraph to summarise." };

    const access = await checkAIAccess(me.id, "chat").catch(() => ({ allowed: false }));
    if (!access.allowed) return { ok: false, error: "AI access required." };

    const styleDirective =
      input.style === "executive" ? "a crisp 3-4 sentence executive summary"
      : input.style === "tldr" ? "a punchy TL;DR in 2 sentences"
      : "a 5-bullet breakdown of the key points";

    const prompt = `Summarise the following document. Return ONLY valid JSON — no markdown.

Document:
${input.text.slice(0, 12000)}

Return:
{
  "summary": "${styleDirective}",
  "bullets": ["<3-6 short bullets covering the most important takeaways>"]
}`;

    const t0 = Date.now();
    const { text, model } = await callLLM(prompt, {
      system: "You are a precise analyst. Produce factual summaries, never add opinions.",
      maxTokens: 700,
    });
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return { ok: false, error: "Could not parse summary." };
    const parsed = JSON.parse(m[0]);
    await logUsage({ userId: me.id, toolId: "chat", model, promptTokens: Math.ceil(prompt.length / 4), completionTokens: Math.ceil(text.length / 4), latencyMs: Date.now() - t0, status: "ok" });
    return { ok: true, data: parsed };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Translate a document into the target language. */
export async function translateDocument(
  input: { text: string; targetLanguage: string; preserveFormatting: boolean },
): Promise<R<{ translated: string }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (input.text.trim().length < 10) return { ok: false, error: "Paste at least a line to translate." };
    if (!input.targetLanguage) return { ok: false, error: "Pick a target language." };

    const access = await checkAIAccess(me.id, "chat").catch(() => ({ allowed: false }));
    if (!access.allowed) return { ok: false, error: "AI access required." };

    const preservation = input.preserveFormatting
      ? "Preserve paragraphs, bullet points, numbered lists, headings and line breaks exactly."
      : "Return flowing prose — feel free to re-paragraph for readability.";

    const prompt = `Translate the following text into ${input.targetLanguage}. ${preservation} Return ONLY the translated text — no explanations, no metadata, no quotes.

TEXT:
${input.text.slice(0, 10000)}`;

    const t0 = Date.now();
    const { text, model } = await callLLM(prompt, {
      system: "You are an expert translator. Preserve meaning and tone. Do not add commentary.",
      maxTokens: 2000,
    });
    await logUsage({ userId: me.id, toolId: "chat", model, promptTokens: Math.ceil(prompt.length / 4), completionTokens: Math.ceil(text.length / 4), latencyMs: Date.now() - t0, status: "ok" });
    return { ok: true, data: { translated: text.trim() } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
