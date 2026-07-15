/** Accept only HTTPS redirects owned by Flutterwave, including checkout
 * subdomains introduced by the provider over time. */
export function isFlutterwaveCheckoutUrl(value: string): boolean {
  try {
    const parsed = new URL(value.trim());
    const host = parsed.hostname.toLowerCase().replace(/\.$/, "");
    return parsed.protocol === "https:" && (host === "flutterwave.com" || host.endsWith(".flutterwave.com"));
  } catch {
    return false;
  }
}
