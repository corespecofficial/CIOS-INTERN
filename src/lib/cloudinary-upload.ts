"use client";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "cios_chat";

export interface UploadedMedia {
  url: string;
  secureUrl: string;
  publicId: string;
  resourceType: "image" | "video" | "raw";
  format: string;
  bytes: number;
  width?: number;
  height?: number;
  duration?: number;
  originalFilename: string;
}

/** Upload a File/Blob to Cloudinary unsigned. Returns the secure URL + metadata. */
export async function uploadToCloudinary(
  file: File | Blob,
  options: { folder?: string; resourceType?: "image" | "video" | "raw" | "auto"; filename?: string } = {}
): Promise<UploadedMedia> {
  if (!CLOUD_NAME) throw new Error("Cloudinary cloud name not configured");
  const resourceType = options.resourceType || "auto";
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;

  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", UPLOAD_PRESET);
  if (options.folder) form.append("folder", options.folder);

  const res = await fetch(url, { method: "POST", body: form });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Cloudinary upload failed: ${err}`);
  }
  const data = await res.json();
  return {
    url: data.url,
    secureUrl: data.secure_url,
    publicId: data.public_id,
    resourceType: data.resource_type,
    format: data.format,
    bytes: data.bytes,
    width: data.width,
    height: data.height,
    duration: data.duration,
    originalFilename: options.filename || data.original_filename || "file",
  };
}

/** Compress an image client-side using canvas. Returns a File under maxBytes. */
export async function compressImage(
  file: File,
  opts: { maxBytes?: number; maxDim?: number; quality?: number } = {}
): Promise<File> {
  const maxBytes = opts.maxBytes ?? 2 * 1024 * 1024; // 2 MB
  const maxDim = opts.maxDim ?? 1920;
  const quality = opts.quality ?? 0.82;

  if (file.size <= maxBytes && file.type === "image/jpeg") return file;

  const img = await loadImage(URL.createObjectURL(file));
  const canvas = document.createElement("canvas");
  let { width, height } = img;
  if (width > maxDim || height > maxDim) {
    const scale = Math.min(maxDim / width, maxDim / height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(img, 0, 0, width, height);

  // Iteratively lower quality until under maxBytes
  let q = quality;
  let blob = await canvasToBlob(canvas, "image/jpeg", q);
  for (let i = 0; i < 5 && blob.size > maxBytes && q > 0.35; i++) {
    q -= 0.15;
    blob = await canvasToBlob(canvas, "image/jpeg", q);
  }
  return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), type, quality);
  });
}

export function isImage(file: File): boolean {
  return file.type.startsWith("image/");
}

export function humanFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ── Ephemeral uploads ─────────────────────────────────────────────────────
// Public-portal uploads are tagged `public-ephemeral` + placed under a
// portal-specific folder so the hourly sweep (/api/cron/cloudinary-sweep) can
// find them. The server action `trackEphemeralUpload` mirrors each one into
// Postgres with a 24h `expires_at`, which the sweep uses to batch-delete from
// Cloudinary + mark the row `deleted_at`. See masterplan §2.4.

export interface EphemeralUploadOptions {
  /** Which portal owns this upload — informs the folder + oversight metrics. */
  portal: "marketplace" | "creative-space" | "opportunities" | "hackathons" | "study-buddy" | "ai-hub" | "documents" | "startups" | "investor" | "partner";
  /** Short label ("cv", "pitch-deck", "product-photo"). Stored in the DB row. */
  kind?: string;
  /** Override Cloudinary resource type. Default: auto. */
  resourceType?: "image" | "video" | "raw" | "auto";
}

/**
 * Upload a file with the 24h auto-delete contract.
 *
 * Returns the same UploadedMedia as `uploadToCloudinary` so call sites only
 * differ in which helper they pick (ephemeral vs permanent). Callers SHOULD
 * then call `trackEphemeralUpload({ publicId, portal, kind, ... })` server-side
 * so the sweep cron has a row to act on.
 */
export async function uploadToCloudinaryEphemeral(
  file: File | Blob,
  opts: EphemeralUploadOptions
): Promise<UploadedMedia> {
  return uploadToCloudinary(file, {
    folder: `public-ephemeral/${opts.portal}`,
    resourceType: opts.resourceType ?? "auto",
  });
}
