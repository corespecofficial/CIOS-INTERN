"use client";

/**
 * Client-side note export + conversion utilities.
 *
 * All of these run in the browser — no Vercel functions burned. PDF uses
 * the browser's built-in print-to-PDF (everyone has it, free, pixel-perfect),
 * image uses html2canvas, and text/markdown/html are pure string ops.
 */

import html2canvas from "html2canvas";

function download(filename: string, data: string | Blob, mime: string) {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Strip HTML to plain text. Uses a detached DOM node so browser handles
 * entities + whitespace rules correctly.
 */
export function htmlToPlainText(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  // Convert block-level elements to newlines for readability.
  div.querySelectorAll("br, p, div, h1, h2, h3, h4, h5, h6, li").forEach((el) => {
    el.insertAdjacentText("afterend", "\n");
  });
  return (div.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
}

/** Very light HTML → Markdown converter — handles the tags our templates use. */
export function htmlToMarkdown(html: string): string {
  let md = html
    .replace(/<(h1)[^>]*>(.*?)<\/h1>/gi, "\n# $2\n")
    .replace(/<(h2)[^>]*>(.*?)<\/h2>/gi, "\n## $2\n")
    .replace(/<(h3)[^>]*>(.*?)<\/h3>/gi, "\n### $2\n")
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**")
    .replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**")
    .replace(/<em[^>]*>(.*?)<\/em>/gi, "_$1_")
    .replace(/<i[^>]*>(.*?)<\/i>/gi, "_$1_")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)")
    .replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, ""); // drop remaining tags
  md = md.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  return md.replace(/\n{3,}/g, "\n\n").trim();
}

/** Export as plain-text .txt */
export function exportAsTxt(title: string, html: string) {
  const text = htmlToPlainText(html);
  download(`${safeName(title)}.txt`, title + "\n\n" + text, "text/plain");
}

/** Export as .md */
export function exportAsMarkdown(title: string, html: string) {
  const md = htmlToMarkdown(html);
  download(`${safeName(title)}.md`, `# ${title}\n\n${md}`, "text/markdown");
}

/**
 * Export as .html — self-contained file the user can open in any browser
 * or import into Word, Docs, etc.
 */
export function exportAsHtml(title: string, html: string) {
  const doc = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>body{font-family:Georgia,serif;max-width:816px;margin:40px auto;padding:24px;color:#111;line-height:1.6;}</style>
</head><body>${html || "<p>(empty)</p>"}</body></html>`;
  download(`${safeName(title)}.html`, doc, "text/html");
}

/**
 * Export as .docx (actually an HTML file with a .doc extension —
 * Microsoft Word + LibreOffice + Google Docs all open this fine).
 */
export function exportAsDoc(title: string, html: string) {
  const doc = `<!doctype html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body>${html || ""}</body></html>`;
  download(`${safeName(title)}.doc`, doc, "application/msword");
}

/**
 * Export as PDF via the browser's print dialog. Opens a new window with a
 * clean print-ready stylesheet and calls window.print(). The user picks
 * "Save as PDF" as the destination. Works on every browser, no server.
 */
export function exportAsPdf(title: string, html: string) {
  const w = window.open("", "_blank", "width=900,height=1100");
  if (!w) { alert("Allow pop-ups to export as PDF."); return; }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  @page { margin: 18mm; }
  body { font-family: Georgia, serif; color: #111; max-width: 780px; margin: 0 auto; line-height: 1.6; }
  h1,h2,h3 { color: #111; }
</style>
</head><body><h1 style="font-size:22px;margin-bottom:18px;">${escapeHtml(title)}</h1>${html || "<p>(empty)</p>"}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 300);
}

/**
 * Export the CURRENT editor canvas as a PNG. Pass the DOM element (so
 * styles from the editor are preserved). Falls back to an HTML render
 * if no element is given.
 */
export async function exportAsImage(title: string, html: string, sourceEl?: HTMLElement | null) {
  // Build a clone styled like a printed page so the image looks right
  // regardless of the editor's surrounding chrome.
  const stage = document.createElement("div");
  stage.style.cssText = "position:fixed;left:-99999px;top:0;width:816px;padding:40px;background:#fff;color:#111;font-family:Georgia,serif;line-height:1.6;";
  stage.innerHTML = `<h1 style="font-size:24px;margin:0 0 18px;">${escapeHtml(title)}</h1>` + (sourceEl ? sourceEl.innerHTML : (html || "<p>(empty)</p>"));
  document.body.appendChild(stage);
  try {
    const canvas = await html2canvas(stage, { backgroundColor: "#ffffff", scale: 2 });
    canvas.toBlob((blob) => {
      if (!blob) return;
      download(`${safeName(title)}.png`, blob, "image/png");
    });
  } finally {
    document.body.removeChild(stage);
  }
}

/** Public URL → QR code image via qrserver.com (free, no account). */
export function qrCodeUrl(url: string, size = 240): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`;
}

/* ─────────────────────────────────────────────
   AI READ ALOUD — uses browser speechSynthesis.
   Zero API cost. Returns handle with stop().
   ───────────────────────────────────────────── */

export interface ReadAloudHandle { stop: () => void; speaking: () => boolean; }

export function readAloud(text: string, opts?: { rate?: number; pitch?: number; voiceName?: string }): ReadAloudHandle | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = opts?.rate ?? 1;
  u.pitch = opts?.pitch ?? 1;
  if (opts?.voiceName) {
    const voice = synth.getVoices().find((v) => v.name === opts.voiceName);
    if (voice) u.voice = voice;
  }
  synth.speak(u);
  return {
    stop: () => synth.cancel(),
    speaking: () => synth.speaking,
  };
}

/* ─────────────────────────────────────────────
   VERSION HISTORY — localStorage per note.
   Keeps the last 10 snapshots with timestamps.
   Zero DB cost, instant restore.
   ───────────────────────────────────────────── */

export interface NoteVersion { at: number; title: string; html: string; wordCount: number; }
const VERSIONS_KEY = (noteId: string) => `cios-note-versions:${noteId}`;
const MAX_VERSIONS = 10;

export function saveVersion(noteId: string, title: string, html: string) {
  try {
    const raw = localStorage.getItem(VERSIONS_KEY(noteId));
    const list: NoteVersion[] = raw ? JSON.parse(raw) : [];
    const last = list[0];
    // Skip consecutive identical snapshots
    if (last && last.title === title && last.html === html) return;
    const words = (htmlToPlainText(html).trim().match(/\S+/g) || []).length;
    list.unshift({ at: Date.now(), title, html, wordCount: words });
    localStorage.setItem(VERSIONS_KEY(noteId), JSON.stringify(list.slice(0, MAX_VERSIONS)));
  } catch { /* quota or disabled */ }
}

export function listVersions(noteId: string): NoteVersion[] {
  try {
    const raw = localStorage.getItem(VERSIONS_KEY(noteId));
    return raw ? (JSON.parse(raw) as NoteVersion[]) : [];
  } catch { return []; }
}

export function clearVersions(noteId: string) {
  try { localStorage.removeItem(VERSIONS_KEY(noteId)); } catch {}
}

/* ─────────────────────────────────────────────
   ENCRYPT DOCUMENT — AES-GCM via Web Crypto.
   Password-derived key (PBKDF2). Output format:
     ENC:v1:<base64(salt)>:<base64(iv)>:<base64(cipher)>
   Anyone with the password can decrypt; server never
   sees plaintext (we store the ENC: string as html).
   ───────────────────────────────────────────── */

const ENC_PREFIX = "ENC:v1:";

function b64(bytes: Uint8Array): string {
  let s = ""; bytes.forEach((b) => { s += String.fromCharCode(b); });
  return btoa(s);
}
function unb64(s: string): Uint8Array {
  const bin = atob(s); const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const mat = await crypto.subtle.importKey("raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: 120_000, hash: "SHA-256" },
    mat,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptHtml(plain: string, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, new TextEncoder().encode(plain)));
  return `${ENC_PREFIX}${b64(salt)}:${b64(iv)}:${b64(cipher)}`;
}

export async function decryptHtml(payload: string, password: string): Promise<string> {
  if (!payload.startsWith(ENC_PREFIX)) throw new Error("Not encrypted");
  const [, saltB64, ivB64, cipherB64] = payload.split(":");
  const salt = unb64(saltB64), iv = unb64(ivB64), cipher = unb64(cipherB64);
  const key = await deriveKey(password, salt);
  try {
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, cipher as BufferSource);
    return new TextDecoder().decode(plain);
  } catch { throw new Error("Wrong password"); }
}

export function isEncrypted(html: string): boolean {
  return typeof html === "string" && html.startsWith(ENC_PREFIX);
}

function safeName(s: string): string {
  return (s || "document").replace(/[^A-Za-z0-9._ -]/g, "").replace(/\s+/g, "_").slice(0, 80) || "document";
}
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c));
}
