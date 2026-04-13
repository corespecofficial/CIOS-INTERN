import { supabaseAdmin } from "@/lib/db";

export type AiProvider =
  | "openai"
  | "anthropic"
  | "gemini"
  | "openrouter"
  | "xai"
  | "mistral"
  | "cohere"
  | "deepseek"
  | "groq"
  | "together"
  | "fireworks"
  | "perplexity";

export interface AiConfig {
  provider: AiProvider;
  apiKey: string;
  model: string;
}

/** Providers that speak the OpenAI /v1/chat/completions API */
const OPENAI_COMPATIBLE_BASE: Partial<Record<AiProvider, string>> = {
  openai: "https://api.openai.com/v1",
  openrouter: "https://openrouter.ai/api/v1",
  xai: "https://api.x.ai/v1",
  mistral: "https://api.mistral.ai/v1",
  deepseek: "https://api.deepseek.com/v1",
  groq: "https://api.groq.com/openai/v1",
  together: "https://api.together.xyz/v1",
  fireworks: "https://api.fireworks.ai/inference/v1",
  perplexity: "https://api.perplexity.ai",
};

export const PROVIDER_LABELS: Record<AiProvider, string> = {
  openai: "OpenAI (GPT-4o, o3)",
  anthropic: "Anthropic Claude (4.5, 3.5)",
  gemini: "Google Gemini (2.0 Flash, 1.5 Pro)",
  openrouter: "OpenRouter (400+ models, any key)",
  xai: "xAI Grok",
  mistral: "Mistral (Large, Medium, Codestral)",
  cohere: "Cohere (Command R+)",
  deepseek: "DeepSeek (V3, R1)",
  groq: "Groq — Llama / Gemma (ultra-fast)",
  together: "Together AI — Llama / Mixtral",
  fireworks: "Fireworks — Llama 3.3, DeepSeek",
  perplexity: "Perplexity (Sonar, grounded)",
};

export const PROVIDER_DEFAULT_MODEL: Record<AiProvider, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-haiku-20241022",
  gemini: "gemini-2.0-flash",
  openrouter: "openai/gpt-4o-mini",
  xai: "grok-2-latest",
  mistral: "mistral-small-latest",
  cohere: "command-r-plus",
  deepseek: "deepseek-chat",
  groq: "llama-3.3-70b-versatile",
  together: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
  fireworks: "accounts/fireworks/models/llama-v3p3-70b-instruct",
  perplexity: "sonar",
};

export const PROVIDER_KEY_HINT: Record<AiProvider, string> = {
  openai: "Get one at platform.openai.com/api-keys. Starts with sk-…",
  anthropic: "console.anthropic.com. Starts with sk-ant-…",
  gemini: "aistudio.google.com/apikey. Starts with AIza…",
  openrouter: "openrouter.ai/keys. Starts with sk-or-… · Best if you want many models on one key.",
  xai: "console.x.ai. Starts with xai-…",
  mistral: "console.mistral.ai. Any string you generate in the console.",
  cohere: "dashboard.cohere.com/api-keys.",
  deepseek: "platform.deepseek.com/api_keys. Very cheap, strong at reasoning.",
  groq: "console.groq.com/keys. Starts with gsk_… · Fastest Llama inference available.",
  together: "api.together.xyz/settings/api-keys. Wide Llama/Mixtral lineup.",
  fireworks: "fireworks.ai/api-keys. Fast Llama + DeepSeek variants.",
  perplexity: "perplexity.ai/settings/api. Returns cited, web-grounded answers.",
};

async function getSetting(key: string): Promise<string | null> {
  const { data } = await supabaseAdmin().from("system_settings").select("value").eq("key", key).maybeSingle();
  return data?.value ?? null;
}

/** Reads AI configuration set by super admin. */
export async function getAiConfig(): Promise<AiConfig | null> {
  const provider = (await getSetting("ai.provider")) as AiProvider | null;
  if (!provider) return null;
  const apiKey = await getSetting(`ai.${provider}.key`);
  if (!apiKey) return null;
  const model = (await getSetting(`ai.${provider}.model`)) || PROVIDER_DEFAULT_MODEL[provider];
  return { provider, apiKey, model };
}

export async function setAiConfig(provider: AiProvider, apiKey: string, model: string, actorId: string) {
  const sb = supabaseAdmin();
  const updates = [
    { key: "ai.provider", value: provider },
    { key: `ai.${provider}.key`, value: apiKey },
    { key: `ai.${provider}.model`, value: model },
  ];
  for (const u of updates) {
    await sb.from("system_settings").upsert({ ...u, updated_by: actorId, updated_at: new Date().toISOString() });
  }
}

export async function clearAiConfig() {
  const sb = supabaseAdmin();
  const keys: string[] = ["ai.provider"];
  for (const p of Object.keys(PROVIDER_LABELS) as AiProvider[]) {
    keys.push(`ai.${p}.key`, `ai.${p}.model`);
  }
  await sb.from("system_settings").delete().in("key", keys);
}

async function callOpenAiCompatible(cfg: AiConfig, base: string, system: string, prompt: string, max: number, temp: number) {
  const extraHeaders: Record<string, string> = cfg.provider === "openrouter"
    ? { "http-referer": "https://cospronos.com", "x-title": "CIOS" }
    : {};
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "authorization": `Bearer ${cfg.apiKey}`, "content-type": "application/json", ...extraHeaders },
    body: JSON.stringify({
      model: cfg.model,
      messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
      max_tokens: max, temperature: temp,
    }),
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`${cfg.provider} ${res.status}: ${t.slice(0, 300)}`); }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

export async function callLLM(
  prompt: string,
  opts: { system?: string; maxTokens?: number; temperature?: number } = {}
): Promise<{ text: string; provider: AiProvider; model: string }> {
  const cfg = await getAiConfig();
  if (!cfg) throw new Error("AI is not configured. Ask the super admin to add an API key at /super-admin/ai-settings.");
  const system = opts.system || "You are a helpful learning assistant for the CIOS platform. Keep answers concise, clear, and practical.";
  const max = opts.maxTokens ?? 600;
  const temp = opts.temperature ?? 0.3;

  // OpenAI-compatible path (covers 9 of the 12 providers)
  const base = OPENAI_COMPATIBLE_BASE[cfg.provider];
  if (base) {
    const text = await callOpenAiCompatible(cfg, base, system, prompt, max, temp);
    return { text, provider: cfg.provider, model: cfg.model };
  }

  if (cfg.provider === "gemini") {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.model)}:generateContent?key=${cfg.apiKey}`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: temp, maxOutputTokens: max },
      }),
    });
    if (!res.ok) { const t = await res.text(); throw new Error(`Gemini ${res.status}: ${t.slice(0, 300)}`); }
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.map((p: { text: string }) => p.text).join("\n") || "";
    return { text, provider: "gemini", model: cfg.model };
  }

  if (cfg.provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": cfg.apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: cfg.model, max_tokens: max, system, messages: [{ role: "user", content: prompt }] }),
    });
    if (!res.ok) { const t = await res.text(); throw new Error(`Claude ${res.status}: ${t.slice(0, 300)}`); }
    const data = await res.json();
    const text = (data.content || []).map((c: { text?: string }) => c.text || "").join("\n");
    return { text, provider: "anthropic", model: cfg.model };
  }

  if (cfg.provider === "cohere") {
    const res = await fetch("https://api.cohere.com/v2/chat", {
      method: "POST",
      headers: { "authorization": `Bearer ${cfg.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: cfg.model,
        messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
        temperature: temp, max_tokens: max,
      }),
    });
    if (!res.ok) { const t = await res.text(); throw new Error(`Cohere ${res.status}: ${t.slice(0, 300)}`); }
    const data = await res.json();
    const text = (data.message?.content || []).map((c: { text?: string }) => c.text || "").join("\n");
    return { text, provider: "cohere", model: cfg.model };
  }

  throw new Error(`Unsupported provider: ${cfg.provider}`);
}

export async function logAiUsage(userId: string, feature: string, provider: string, tokensIn = 0, tokensOut = 0) {
  await supabaseAdmin().from("ai_usage").insert({ user_id: userId, feature, provider, tokens_in: tokensIn, tokens_out: tokensOut });
}
