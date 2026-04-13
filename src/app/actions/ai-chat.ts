"use server";

import { getCurrentDbUser } from "@/lib/db";
import { callLLM } from "@/lib/ai-client";
import { checkAIAccess, logUsage, type AIToolId } from "@/lib/ai-access";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export interface ChatMessage { role: "user" | "assistant" | "system"; content: string }

/** Send a chat message. Enforces AI access, logs usage. */
export async function sendChat(input: {
  toolId: AIToolId;
  messages: ChatMessage[];
  system?: string;
  maxTokens?: number;
}): Promise<R<{ reply: string; model: string; provider: string; latencyMs: number }>> {
  const me = await getCurrentDbUser();
  if (!me) return { ok: false, error: "Unauthorized" };

  const access = await checkAIAccess(me.id, input.toolId);
  if (!access.allowed) {
    return { ok: false, error:
      access.reason === "not_granted" ? "AI Tools access has not been granted yet." :
      access.reason === "expired" ? "Your AI access has expired." :
      access.reason === "quota_exceeded" ? `Daily token quota reached (${access.dailyCap?.toLocaleString()}).` :
      "AI access denied."
    };
  }

  // Compose prompt from the thread
  const history = input.messages.filter((m) => m.role !== "system").slice(-10);
  const lastUser = [...history].reverse().find((m) => m.role === "user");
  if (!lastUser) return { ok: false, error: "No user message" };

  // Inline prior turns into the prompt (keeps it provider-agnostic)
  const priorTurns = history.slice(0, -1).map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n");
  const prompt = priorTurns ? `${priorTurns}\nUser: ${lastUser.content}` : lastUser.content;

  const t0 = Date.now();
  try {
    // Cap system-prompt length so memory files can't blow up tokens
    const systemPrompt = (input.system || "You are a helpful CIOS assistant. Be concise and practical.").slice(0, 4000);
    const { text, model, provider } = await callLLM(prompt, {
      system: systemPrompt,
      maxTokens: input.maxTokens || 800,
    });
    const latency = Date.now() - t0;
    // Rough token estimation (1 token ≈ 4 chars)
    const promptTokens = Math.ceil(prompt.length / 4);
    const completionTokens = Math.ceil((text || "").length / 4);
    await logUsage({ userId: me.id, toolId: input.toolId, model, promptTokens, completionTokens, latencyMs: latency, status: "ok" });
    return { ok: true, data: { reply: text, model, provider, latencyMs: latency } };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await logUsage({ userId: me.id, toolId: input.toolId, latencyMs: Date.now() - t0, status: "error", error: msg });
    return { ok: false, error: msg };
  }
}
