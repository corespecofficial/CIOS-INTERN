"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { saveAiSettings, clearAiSettings, testAiConnection } from "@/app/actions/ai-settings";

type Provider =
  | "openai" | "anthropic" | "gemini" | "openrouter" | "xai" | "mistral"
  | "cohere" | "deepseek" | "groq" | "together" | "fireworks" | "perplexity";

const LABELS: Record<Provider, string> = {
  openai: "OpenAI (GPT-4o, o3)",
  anthropic: "Anthropic Claude (4.5, 3.5)",
  gemini: "Google Gemini (2.0 Flash, 1.5 Pro)",
  openrouter: "OpenRouter (400+ models)",
  xai: "xAI Grok",
  mistral: "Mistral (Large, Codestral)",
  cohere: "Cohere (Command R+)",
  deepseek: "DeepSeek (V3, R1)",
  groq: "Groq — Llama / Gemma ⚡",
  together: "Together — Llama / Mixtral",
  fireworks: "Fireworks — Llama / DeepSeek",
  perplexity: "Perplexity (Sonar, grounded)",
};

const DEFAULTS: Record<Provider, string> = {
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

// Curated model picks per provider (user can still type a custom model)
const MODEL_PRESETS: Record<Provider, string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini", "o3-mini"],
  anthropic: ["claude-opus-4-5", "claude-sonnet-4-5", "claude-3-5-haiku-20241022", "claude-3-5-sonnet-20241022"],
  gemini: ["gemini-2.0-flash", "gemini-2.0-flash-exp", "gemini-1.5-pro", "gemini-1.5-flash"],
  openrouter: ["openai/gpt-4o-mini", "anthropic/claude-3.5-sonnet", "google/gemini-2.0-flash-exp:free", "meta-llama/llama-3.3-70b-instruct", "deepseek/deepseek-chat"],
  xai: ["grok-2-latest", "grok-2-1212", "grok-beta"],
  mistral: ["mistral-large-latest", "mistral-small-latest", "codestral-latest", "ministral-8b-latest"],
  cohere: ["command-r-plus", "command-r", "command-light"],
  deepseek: ["deepseek-chat", "deepseek-reasoner"],
  groq: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "gemma2-9b-it", "mixtral-8x7b-32768"],
  together: ["meta-llama/Llama-3.3-70B-Instruct-Turbo", "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo", "mistralai/Mixtral-8x7B-Instruct-v0.1", "deepseek-ai/DeepSeek-V3"],
  fireworks: ["accounts/fireworks/models/llama-v3p3-70b-instruct", "accounts/fireworks/models/deepseek-v3", "accounts/fireworks/models/mixtral-8x7b-instruct"],
  perplexity: ["sonar", "sonar-pro", "sonar-reasoning"],
};

const HINTS: Record<Provider, string> = {
  openai: "platform.openai.com/api-keys · Starts with sk-…",
  anthropic: "console.anthropic.com · Starts with sk-ant-…",
  gemini: "aistudio.google.com/apikey · Starts with AIza…",
  openrouter: "openrouter.ai/keys · sk-or-… · Best for access to many models on ONE key",
  xai: "console.x.ai · Starts with xai-…",
  mistral: "console.mistral.ai · Generate any key",
  cohere: "dashboard.cohere.com/api-keys",
  deepseek: "platform.deepseek.com/api_keys · Very cheap, strong reasoning",
  groq: "console.groq.com/keys · gsk_… · Fastest Llama inference available",
  together: "api.together.xyz/settings/api-keys · Wide Llama/Mixtral lineup",
  fireworks: "fireworks.ai/api-keys · Llama + DeepSeek variants",
  perplexity: "perplexity.ai/settings/api · Web-grounded cited answers",
};

const GROUPS: { title: string; providers: Provider[] }[] = [
  { title: "Top proprietary", providers: ["openai", "anthropic", "gemini", "xai"] },
  { title: "🦙 Llama / open-source hosts", providers: ["groq", "together", "fireworks"] },
  { title: "Multi-model gateways", providers: ["openrouter", "perplexity"] },
  { title: "Other majors", providers: ["mistral", "cohere", "deepseek"] },
];

export default function AiSettingsPage() {
  const [provider, setProvider] = useState<Provider>("openai");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(DEFAULTS.openai);
  const [busy, setBusy] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => { setModel(DEFAULTS[provider]); }, [provider]);

  async function save() {
    if (!apiKey.trim()) { toast.error("Paste an API key first"); return; }
    setBusy(true);
    const r = await saveAiSettings(provider, apiKey, model);
    setBusy(false);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success(`Saved · using ${LABELS[provider]}`);
    setApiKey("");
  }

  async function test() {
    setBusy(true);
    setTestResult(null);
    const r = await testAiConnection();
    setBusy(false);
    if (!r.ok) { toast.error(r.error); setTestResult(`❌ ${r.error}`); return; }
    setTestResult(`✅ Connected to ${r.data!.provider} (${r.data!.model})\n\n"${r.data!.sample}"`);
    toast.success("Connection successful");
  }

  async function clear() {
    if (!confirm("Clear all AI keys? AI features will stop working platform-wide.")) return;
    setBusy(true);
    const r = await clearAiSettings();
    setBusy(false);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("AI settings cleared");
    setApiKey(""); setTestResult(null);
  }

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ marginBottom: 20 }}>
        <span style={{ display: "inline-block", padding: "3px 10px", background: "rgba(171,71,188,0.15)", color: "#AB47BC", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 6 }}>
          SUPER ADMIN · AI
        </span>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: "2px 0" }}>AI provider settings</h1>
        <p style={{ fontSize: 13, color: "#8892A4", margin: 0 }}>
          Pick one provider. The key you paste here powers lesson summaries, practice questions, plagiarism checks, AI content detection, and future AI features across the platform.
        </p>
      </div>

      <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div style={lbl}>Provider · 12 options</div>
          {GROUPS.map((g) => (
            <div key={g.title} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: "#5A6478", fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>{g.title}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {g.providers.map((p) => (
                  <button
                    key={p}
                    onClick={() => setProvider(p)}
                    style={{
                      padding: "7px 12px", borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer",
                      background: provider === p ? "#1E88E5" : "transparent",
                      color: provider === p ? "#fff" : "#8892A4",
                      border: provider === p ? "none" : "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    {LABELS[p]}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <p style={{ fontSize: 11, color: "#8892A4", marginTop: 6 }}>🔗 {HINTS[provider]}</p>
        </div>

        <div>
          <div style={lbl}>API Key</div>
          <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
            placeholder="Paste your key (stored in system_settings; never shown again)" style={input} />
        </div>
        <div>
          <div style={lbl}>Model</div>
          <select
            value={MODEL_PRESETS[provider].includes(model) ? model : "__custom__"}
            onChange={(e) => { if (e.target.value !== "__custom__") setModel(e.target.value); }}
            style={{ ...input, marginBottom: 6 }}
          >
            {MODEL_PRESETS[provider].map((m) => <option key={m} value={m}>{m}</option>)}
            <option value="__custom__">— Custom (type below) —</option>
          </select>
          <input value={model} onChange={(e) => setModel(e.target.value)} placeholder={DEFAULTS[provider]} style={input} />
          <p style={{ fontSize: 11, color: "#8892A4", marginTop: 4 }}>Default: <code>{DEFAULTS[provider]}</code></p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={save} disabled={busy} style={btnPrimary}>💾 Save</button>
          <button onClick={test} disabled={busy} style={btnGhost}>🧪 Test connection</button>
          <button onClick={clear} disabled={busy} style={{ ...btnGhost, color: "#EF5350", borderColor: "rgba(239,83,80,0.3)", marginLeft: "auto" }}>🗑 Clear all keys</button>
        </div>

        {testResult && (
          <div style={{ background: "#0A0E1A", border: "1px solid rgba(102,187,106,0.2)", borderRadius: 10, padding: 14, fontSize: 12, color: "#E8EDF5", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
            {testResult}
          </div>
        )}
      </div>

      <div style={{ marginTop: 20, padding: 14, background: "rgba(255,193,7,0.08)", border: "1px solid rgba(255,193,7,0.2)", borderRadius: 12, fontSize: 12, color: "#8892A4", lineHeight: 1.7 }}>
        <b style={{ color: "#FFC107" }}>🦙 Llama note:</b> Best Llama experience is <b style={{ color: "#E8EDF5" }}>Groq</b> (fastest) or <b style={{ color: "#E8EDF5" }}>Together</b> (widest model selection). Both are OpenAI-compatible so setup is identical — paste key, hit save.<br/><br/>
        <b style={{ color: "#FFC107" }}>Multi-model tip:</b> Use <b style={{ color: "#E8EDF5" }}>OpenRouter</b> with one key to access GPT-4o, Claude, Llama, Gemini, DeepSeek, and 400+ others from a single dashboard. Change model name anytime without re-configuring.
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#8892A4", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 };
const input: React.CSSProperties = {
  width: "100%", background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 10, padding: "10px 14px", color: "#E8EDF5", fontSize: 13, outline: "none",
  fontFamily: "inherit",
};
const btnPrimary: React.CSSProperties = {
  background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff",
  border: "none", borderRadius: 10, padding: "10px 18px",
  fontSize: 13, fontWeight: 700, cursor: "pointer",
};
const btnGhost: React.CSSProperties = {
  background: "transparent", color: "#E8EDF5",
  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
  padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
};
