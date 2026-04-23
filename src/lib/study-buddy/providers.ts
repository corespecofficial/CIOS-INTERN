/* Study Buddy v2 — provider abstraction (Phase 5 refactor).
 *
 * Each capability (STT / TTS / Avatar) resolves its config on every call so a
 * super-admin can flip providers or rotate keys without restarting the server.
 *
 * Config resolution order:
 *   1. ENV VAR                           (dev / CI / local override)
 *   2. `system_settings` table via getSetting()   (production — set via Super Admin)
 *   3. Default "free" provider ("browser" STT/TTS, "off" Avatar)
 *
 * Keys expected in system_settings (all optional):
 *   sb.stt.provider             "browser" | "groq"
 *   sb.stt.groq.key             Groq API key
 *
 *   sb.tts.provider             "browser" | "elevenlabs" | "openai"
 *   sb.tts.elevenlabs.key       ElevenLabs API key
 *   sb.tts.elevenlabs.voice     Default voice id
 *   sb.tts.openai.key           OpenAI API key
 *
 *   sb.avatar.provider          "off" | "heygen"
 *   sb.avatar.heygen.key        HeyGen API key
 *   sb.avatar.heygen.avatar_id  Default avatar id
 */

import "server-only";
import { supabaseAdmin } from "@/lib/db";

/* ─────────── Shared types ─────────── */

export interface STTProvider {
  id: string;
  transcribe(input: { fileUrl?: string; blob?: Blob; language?: string }): Promise<{ text: string; durationSec?: number }>;
}

export interface TTSProvider {
  id: string;
  synthesize(input: { text: string; language: string; voice?: string }): Promise<{ audioUrl: string | null; durationSec?: number }>;
  readonly playback: "server-audio-url" | "client-speech-synthesis";
}

export interface AvatarProvider {
  id: string;
  generate(input: { script: string; language: string; avatar?: string }): Promise<{ videoUrl: string | null; videoId?: string; durationSec?: number; status: "ready" | "requires_launch_provider" | "processing" }>;
  /** Optional: some providers need polling after generate() returns "processing". */
  pollStatus?(videoId: string): Promise<{ status: "ready" | "processing" | "failed"; videoUrl?: string; error?: string }>;
}

/* ─────────── Settings loader ─────────── */

/** Read a single setting, returning null if missing. Cached for 10 seconds
 *  so we don't hit the DB on every provider call during a burst. */
const CACHE_TTL_MS = 10_000;
const cache = new Map<string, { value: string | null; expiresAt: number }>();

async function getSetting(key: string): Promise<string | null> {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value;
  try {
    const { data } = await supabaseAdmin().from("system_settings").select("value").eq("key", key).maybeSingle();
    const value = (data as { value?: string | null } | null)?.value ?? null;
    cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    return value;
  } catch {
    return null;
  }
}

async function pickConfig(envVar: string, settingsKey: string): Promise<string | null> {
  const fromEnv = process.env[envVar];
  if (fromEnv) return fromEnv;
  return await getSetting(settingsKey);
}

/* ─────────── STT implementations ─────────── */

const browserSTT: STTProvider = {
  id: "browser",
  async transcribe() {
    return {
      text: "[Audio transcription needs an STT provider. Use the mic button to dictate live, or have your super-admin enable Groq in settings.]",
    };
  },
};

const groqSTT: STTProvider = {
  id: "groq",
  async transcribe({ fileUrl, blob, language }) {
    const key = await pickConfig("GROQ_API_KEY", "sb.stt.groq.key");
    if (!key) throw new Error("Groq STT not configured — set sb.stt.groq.key in Super Admin");
    const form = new FormData();
    if (blob) form.append("file", blob);
    else if (fileUrl) {
      const r = await fetch(fileUrl);
      const b = await r.blob();
      form.append("file", b, "audio");
    } else throw new Error("No audio input");
    form.append("model", "whisper-large-v3-turbo");
    if (language) form.append("language", language);
    const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    if (!r.ok) throw new Error(`Groq STT ${r.status}: ${await r.text()}`);
    const j = (await r.json()) as { text: string; duration?: number };
    return { text: j.text, durationSec: j.duration };
  },
};

/* ─────────── TTS implementations ─────────── */

const browserTTS: TTSProvider = {
  id: "browser",
  playback: "client-speech-synthesis",
  async synthesize() { return { audioUrl: null }; },
};

const elevenLabsTTS: TTSProvider = {
  id: "elevenlabs",
  playback: "server-audio-url",
  async synthesize({ text, voice }) {
    const key = await pickConfig("ELEVENLABS_API_KEY", "sb.tts.elevenlabs.key");
    if (!key) throw new Error("ElevenLabs not configured — set sb.tts.elevenlabs.key in Super Admin");
    const defaultVoice = await getSetting("sb.tts.elevenlabs.voice");
    const voiceId = voice || defaultVoice || "21m00Tcm4TlvDq8ikWAM";
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });
    if (!r.ok) throw new Error(`ElevenLabs ${r.status}: ${await r.text()}`);
    const buf = Buffer.from(await r.arrayBuffer());
    return { audioUrl: `data:audio/mpeg;base64,${buf.toString("base64")}` };
  },
};

const openaiTTS: TTSProvider = {
  id: "openai",
  playback: "server-audio-url",
  async synthesize({ text, voice }) {
    const key = await pickConfig("OPENAI_API_KEY", "sb.tts.openai.key");
    if (!key) throw new Error("OpenAI TTS not configured — set sb.tts.openai.key in Super Admin");
    const r = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "tts-1", input: text, voice: voice || "alloy" }),
    });
    if (!r.ok) throw new Error(`OpenAI TTS ${r.status}: ${await r.text()}`);
    const buf = Buffer.from(await r.arrayBuffer());
    return { audioUrl: `data:audio/mpeg;base64,${buf.toString("base64")}` };
  },
};

/* ─────────── Avatar implementations ─────────── */

const offAvatar: AvatarProvider = {
  id: "off",
  async generate() { return { videoUrl: null, status: "requires_launch_provider" }; },
};

const heygenAvatar: AvatarProvider = {
  id: "heygen",
  async generate({ script, avatar }) {
    const key = await pickConfig("HEYGEN_API_KEY", "sb.avatar.heygen.key");
    if (!key) throw new Error("HeyGen not configured — set sb.avatar.heygen.key in Super Admin");
    const defaultAvatar = await getSetting("sb.avatar.heygen.avatar_id");
    const avatarId = avatar || defaultAvatar || "";
    if (!avatarId) throw new Error("HeyGen avatar_id missing — set sb.avatar.heygen.avatar_id in Super Admin");

    const r = await fetch("https://api.heygen.com/v2/video/generate", {
      method: "POST",
      headers: { "X-Api-Key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        video_inputs: [{
          character: { type: "avatar", avatar_id: avatarId, avatar_style: "normal" },
          voice: { type: "text", input_text: script },
        }],
      }),
    });
    if (!r.ok) throw new Error(`HeyGen ${r.status}: ${await r.text()}`);
    const j = (await r.json()) as { data?: { video_id?: string } };
    const videoId = j.data?.video_id;
    if (!videoId) throw new Error("HeyGen didn't return a video_id");
    return { videoUrl: null, videoId, status: "processing" };
  },
  async pollStatus(videoId) {
    const key = await pickConfig("HEYGEN_API_KEY", "sb.avatar.heygen.key");
    if (!key) return { status: "failed", error: "HeyGen not configured" };
    const r = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${videoId}`, {
      headers: { "X-Api-Key": key },
    });
    if (!r.ok) return { status: "failed", error: `HeyGen status ${r.status}` };
    const j = (await r.json()) as { data?: { status?: string; video_url?: string; error?: { message?: string } } };
    const st = j.data?.status;
    if (st === "completed") return { status: "ready", videoUrl: j.data?.video_url };
    if (st === "failed") return { status: "failed", error: j.data?.error?.message || "HeyGen generation failed" };
    return { status: "processing" };
  },
};

/* ─────────── Resolver (called per-request, cached briefly) ─────────── */

async function resolveSTT(): Promise<STTProvider> {
  const id = (process.env.STT_PROVIDER || (await getSetting("sb.stt.provider")) || "browser").toLowerCase();
  switch (id) {
    case "groq":    return groqSTT;
    default:        return browserSTT;
  }
}

async function resolveTTS(): Promise<TTSProvider> {
  const id = (process.env.TTS_PROVIDER || (await getSetting("sb.tts.provider")) || "browser").toLowerCase();
  switch (id) {
    case "elevenlabs": return elevenLabsTTS;
    case "openai":     return openaiTTS;
    default:           return browserTTS;
  }
}

async function resolveAvatar(): Promise<AvatarProvider> {
  const id = (process.env.AVATAR_PROVIDER || (await getSetting("sb.avatar.provider")) || "off").toLowerCase();
  switch (id) {
    case "heygen": return heygenAvatar;
    default:       return offAvatar;
  }
}

/* ─────────── Public facade (lazy-resolving) ─────────── */

export const stt: STTProvider = {
  get id() { return "dynamic"; },
  async transcribe(input) { return (await resolveSTT()).transcribe(input); },
};

export const tts: TTSProvider = {
  get id() { return "dynamic"; },
  get playback() { return "client-speech-synthesis"; /* UI uses ttsPlaybackStrategy() at runtime */ },
  async synthesize(input) { return (await resolveTTS()).synthesize(input); },
} as TTSProvider;

export const avatar: AvatarProvider = {
  get id() { return "dynamic"; },
  async generate(input) { return (await resolveAvatar()).generate(input); },
  async pollStatus(videoId) {
    const p = await resolveAvatar();
    if (!p.pollStatus) return { status: "failed", error: "Current provider doesn't support polling" };
    return p.pollStatus(videoId);
  },
};

/** Runtime-resolved playback strategy — UI calls this to decide whether to
 *  use the server-returned audio URL or browser speechSynthesis. */
export async function ttsPlaybackStrategy(): Promise<TTSProvider["playback"]> {
  return (await resolveTTS()).playback;
}

/** Exposed for admin diagnostics — which providers are actually active right now. */
export async function getActiveProviderIds(): Promise<{ stt: string; tts: string; avatar: string }> {
  const [s, t, a] = await Promise.all([resolveSTT(), resolveTTS(), resolveAvatar()]);
  return { stt: s.id, tts: t.id, avatar: a.id };
}
