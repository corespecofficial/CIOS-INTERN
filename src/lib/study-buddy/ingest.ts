/* Study Buddy v2 — source ingest. All extractors are free / open-source.
 *
 * Every source (YouTube link, URL, PDF, DOCX, image, raw text, .txt/.md/.rtf
 * upload) is normalized into a list of `ExtractedChunk`s. Chunks are stored in
 * `study_source_chunks` and fed into `buildKnowledgeMap` for the wizard.
 *
 * Server-side (Node) only — do not import from client components. */

import "server-only";

/* ─────────── Types ─────────── */

export type SourceKind =
  | "text"       // pasted prose
  | "youtube"    // URL → transcript
  | "url"        // generic web page
  | "pdf"
  | "docx"
  | "audio"      // mp3/m4a/wav — routed to STT provider (Phase 4)
  | "video"      // mp4 — audio extract → STT (Phase 4)
  | "image";     // OCR

export interface SourceInput {
  kind: SourceKind;
  /** For URLs: the URL. For uploads: the filename or Storage ref. For paste: a short tag. */
  ref: string;
  /** Friendly label surfaced to the user. */
  label?: string;
  /** Inline text body (paste path) or base64 data-URL (upload path). */
  body?: string;
  /** For file uploads — raw bytes. */
  buffer?: Buffer;
  /** Originating MIME type. */
  mime?: string;
}

export interface ExtractedChunk {
  kind: SourceKind;
  ref: string;
  label?: string;
  text: string;
  pageOrTimestamp?: string;
  chunkIndex: number;
}

export interface IngestResult {
  chunks: ExtractedChunk[];
  warnings: string[];
}

/* ─────────── Public entry ─────────── */

/** Ingest a mixed list of sources. Errors on any one source are captured in
 *  `warnings` — we always return whatever succeeded so a single bad link
 *  doesn't sink the session. */
export async function ingestSources(sources: SourceInput[]): Promise<IngestResult> {
  const chunks: ExtractedChunk[] = [];
  const warnings: string[] = [];

  for (const s of sources) {
    try {
      const extracted = await extractOne(s);
      chunks.push(...extracted);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      warnings.push(`${s.kind} (${s.label || s.ref}): ${msg}`);
    }
  }

  return { chunks, warnings };
}

async function extractOne(s: SourceInput): Promise<ExtractedChunk[]> {
  switch (s.kind) {
    case "text":    return extractText(s);
    case "youtube": return extractYouTube(s);
    case "url":     return extractUrl(s);
    case "pdf":     return extractPdf(s);
    case "docx":    return extractDocx(s);
    case "image":   return extractImage(s);
    case "audio":
    case "video":   return extractAudioVideo(s);
  }
}

/* ─────────── Extractors ─────────── */

function extractText(s: SourceInput): ExtractedChunk[] {
  const body = s.body || "";
  if (body.trim().length < 1) throw new Error("Empty text");
  return chunkText(body, { kind: "text", ref: s.ref || "paste", label: s.label || "Pasted notes" });
}

async function extractYouTube(s: SourceInput): Promise<ExtractedChunk[]> {
  // youtube-transcript fetches the auto-captions directly — no API key.
  const { YoutubeTranscript } = await import("youtube-transcript");
  const videoId = parseYouTubeId(s.ref);
  if (!videoId) throw new Error("Not a valid YouTube URL");

  const segments = await YoutubeTranscript.fetchTranscript(videoId).catch((e: unknown) => {
    throw new Error(
      `Captions unavailable — ${e instanceof Error ? e.message : String(e)}. (Phase 4 will add Whisper fallback.)`
    );
  });

  // Re-aggregate segments into ~400-word chunks, preserving the first timestamp of each chunk
  // so we can surface "0:32" style source-pin citations later.
  const chunks: ExtractedChunk[] = [];
  let buf = "";
  let chunkStartSec = 0;
  let idx = 0;
  const flush = () => {
    if (!buf.trim()) return;
    chunks.push({
      kind: "youtube",
      ref: `https://youtube.com/watch?v=${videoId}`,
      label: s.label || `YouTube · ${videoId}`,
      text: buf.trim(),
      pageOrTimestamp: formatSec(chunkStartSec),
      chunkIndex: idx++,
    });
    buf = "";
  };

  for (const seg of segments) {
    if (!buf) chunkStartSec = seg.offset / 1000;
    buf += " " + seg.text;
    if (wordCount(buf) >= 400) flush();
  }
  flush();

  return chunks;
}

async function extractUrl(s: SourceInput): Promise<ExtractedChunk[]> {
  const url = s.ref;
  if (!/^https?:\/\//i.test(url)) throw new Error("Invalid URL");

  const r = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (CIOS Study Buddy)" },
    redirect: "follow",
  });
  if (!r.ok) throw new Error(`Fetch failed: ${r.status}`);
  const html = await r.text();

  const [{ JSDOM }, { Readability }] = await Promise.all([
    import("jsdom"),
    import("@mozilla/readability"),
  ]);
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();
  const text = article?.textContent?.trim() || "";
  if (text.length < 80) throw new Error("Page had too little readable content");

  return chunkText(text, {
    kind: "url",
    ref: url,
    label: s.label || article?.title || url,
  });
}

async function extractPdf(s: SourceInput): Promise<ExtractedChunk[]> {
  if (!s.buffer) throw new Error("PDF buffer missing");
  // pdf-parse 2.x ships a class-based API (no more `pdfParse(buffer)` function).
  // We load the document once, call `getText()` to get per-page text, then
  // chunk each page separately so pageOrTimestamp citations stay accurate.
  const { PDFParse } = await import("pdf-parse");
  const data = new Uint8Array(s.buffer);
  const parser = new PDFParse({ data });
  let result;
  try {
    result = await parser.getText();
  } finally {
    await parser.destroy().catch(() => {});
  }

  const pages = Array.isArray(result.pages) ? result.pages : [];
  const chunks: ExtractedChunk[] = [];
  let idx = 0;

  if (pages.length > 0) {
    pages.forEach((p, pageIdx: number) => {
      // pdf-parse v2 PageTextResult usually exposes `text` for plain text.
      const pageText = typeof (p as { text?: unknown }).text === "string"
        ? ((p as { text: string }).text)
        : String(p ?? "");
      const trimmed = pageText.trim();
      if (!trimmed) return;
      const sub = chunkText(trimmed, {
        kind: "pdf",
        ref: s.ref,
        label: s.label || s.ref,
        pageOrTimestamp: `p.${pageIdx + 1}`,
      });
      for (const c of sub) chunks.push({ ...c, chunkIndex: idx++ });
    });
  }

  // Fallback: if per-page text missed but the aggregate has content, chunk it.
  if (chunks.length === 0 && result.text?.trim()) {
    const sub = chunkText(result.text.trim(), {
      kind: "pdf",
      ref: s.ref,
      label: s.label || s.ref,
    });
    for (const c of sub) chunks.push({ ...c, chunkIndex: idx++ });
  }

  if (chunks.length === 0) {
    throw new Error("No extractable text — scanned PDF? (OCR fallback in Phase 4)");
  }
  return chunks;
}

async function extractDocx(s: SourceInput): Promise<ExtractedChunk[]> {
  if (!s.buffer) throw new Error("DOCX buffer missing");
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({ buffer: s.buffer });
  const text = (value || "").trim();
  if (!text) throw new Error("No text extracted");
  return chunkText(text, { kind: "docx", ref: s.ref, label: s.label || s.ref });
}

async function extractImage(s: SourceInput): Promise<ExtractedChunk[]> {
  if (!s.buffer) throw new Error("Image buffer missing");
  // tesseract.js works in Node (uses emscripten). Slow (~3-10s) but free.
  const Tesseract = await import("tesseract.js");
  const { data } = await Tesseract.recognize(s.buffer, "eng");
  const text = (data?.text || "").trim();
  if (!text || text.length < 20) throw new Error("OCR found no readable text");
  return chunkText(text, { kind: "image", ref: s.ref, label: s.label || s.ref });
}

async function extractAudioVideo(s: SourceInput): Promise<ExtractedChunk[]> {
  // Delegates to the STT provider. With the free `browser` provider this
  // returns a placeholder; at launch `groq` does the real work. We still
  // enqueue the chunk so the UI can show "processing" and have a slot
  // ready to backfill.
  const { stt } = await import("./providers");
  // We don't have an easy way to pass Buffer → provider via blob in server context
  // right now — for Phase 1 we just stash a placeholder chunk. Phase 4 wires
  // Supabase Storage + signed URL → provider → transcript.
  void stt;
  return [{
    kind: s.kind,
    ref: s.ref,
    label: s.label || s.ref,
    text: `[${s.kind} transcription pending — see Phase 4.]`,
    chunkIndex: 0,
  }];
}

/* ─────────── Helpers ─────────── */

function chunkText(
  text: string,
  meta: { kind: SourceKind; ref: string; label?: string; pageOrTimestamp?: string },
): ExtractedChunk[] {
  const cleaned = text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  const words = cleaned.split(/\s+/);
  const CHUNK_SIZE = 500;
  const chunks: ExtractedChunk[] = [];
  for (let i = 0, idx = 0; i < words.length; i += CHUNK_SIZE, idx++) {
    chunks.push({
      kind: meta.kind,
      ref: meta.ref,
      label: meta.label,
      text: words.slice(i, i + CHUNK_SIZE).join(" "),
      pageOrTimestamp: meta.pageOrTimestamp,
      chunkIndex: idx,
    });
  }
  return chunks;
}

function parseYouTubeId(input: string): string | null {
  try {
    // Accept full URLs, short urls, or bare IDs
    const direct = input.match(/^[a-zA-Z0-9_-]{11}$/);
    if (direct) return input;
    const u = new URL(input);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1) || null;
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    const path = u.pathname.match(/\/(embed|shorts|v)\/([a-zA-Z0-9_-]{11})/);
    if (path) return path[2];
    return null;
  } catch {
    return null;
  }
}

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function formatSec(total: number): string {
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/** Given a list of chunks, join them into one prompt-friendly string while
 *  keeping a source-tag prefix so the LLM can cite back accurately. */
export function chunksToPrompt(chunks: ExtractedChunk[], maxChars = 14000): string {
  const out: string[] = [];
  let used = 0;
  for (const c of chunks) {
    const tag = c.pageOrTimestamp ? `[${c.kind}:${c.label || c.ref}:${c.pageOrTimestamp}]` : `[${c.kind}:${c.label || c.ref}]`;
    const block = `${tag}\n${c.text}\n`;
    if (used + block.length > maxChars) break;
    out.push(block);
    used += block.length;
  }
  return out.join("\n");
}
