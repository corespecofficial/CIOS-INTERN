/**
 * Feature flags. Read once at module load — set in `.env.local` /
 * Vercel env. Default OFF so unfinished surfaces stay invisible.
 *
 * Flag values are evaluated as truthy strings: "1", "true", "on" → true.
 */

function flag(name: string): boolean {
  const v = process.env[name];
  if (!v) return false;
  return v === "1" || v.toLowerCase() === "true" || v.toLowerCase() === "on";
}

export const FLAGS = {
  /** Creative-Space host portal (per-org tenant). Phase 1+ rollout. */
  ENABLE_HOST_PORTAL: flag("ENABLE_HOST_PORTAL"),
} as const;
