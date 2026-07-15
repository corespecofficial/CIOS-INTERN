/**
 * Validate the hosted link returned by Flutterwave's authenticated Standard
 * API. Flutterwave uses different checkout hosts for live, test and legacy
 * environments, so the stable security boundary is HTTPS—not one hostname.
 * This value is never accepted from browser/user input.
 */
export function isFlutterwaveCheckoutUrl(value: string): boolean {
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "https:" && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}
