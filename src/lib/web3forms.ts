/**
 * Web3Forms client-side submitter.
 *
 * Web3Forms (https://web3forms.com) is a hosted form-to-email gateway.
 * Each project gets a single `access_key` whose destination email was
 * locked when the key was created — the key is intentionally
 * client-exposed (CORS-allowed) because abuse only routes mail to the
 * pre-configured inbox; nobody else's.
 *
 * That's why we read it from `NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY`. If
 * the env var is missing we fall back to the project key baked in
 * here so dev environments don't need extra setup. Production should
 * still set the env var so rotation doesn't require a deploy.
 *
 * Failures are surfaced as `{ ok: false, error }` so callers can show
 * a toast / inline message; we never throw out of this helper.
 */

const FALLBACK_KEY = "cacc03bc-a013-4338-b7f3-6979a2cdc7ba";
const ENDPOINT = "https://api.web3forms.com/submit";

export type Web3Result = { ok: true } | { ok: false; error: string };

export interface Web3Payload {
  /** REQUIRED — the user's email or whatever the primary contact is */
  email?: string;
  /** Free-form fields are accepted; Web3Forms emails them all back */
  [key: string]: unknown;
  /** Subject line of the resulting email */
  subject?: string;
  /** Friendly "from" name shown in the email */
  from_name?: string;
  /** Optional honeypot (botcheck) — Web3Forms drops the submit if filled */
  botcheck?: string;
}

export async function submitWeb3Form(payload: Web3Payload): Promise<Web3Result> {
  const accessKey = process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY || FALLBACK_KEY;
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ access_key: accessKey, ...payload }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.success) {
      return { ok: false, error: json?.message || `Submission failed (${res.status})` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
}
