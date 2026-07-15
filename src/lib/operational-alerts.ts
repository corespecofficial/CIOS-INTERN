import "server-only";

import { captureEvent } from "@/lib/observability";

export async function operationalAlert(
  title: string,
  severity: "warning" | "error",
  details: Record<string, unknown>,
) {
  captureEvent(title, severity, { tags: { subsystem: "operations" }, extra: details });
  const endpoint = process.env.OPERATIONS_ALERT_WEBHOOK_URL;
  if (!endpoint) return;
  try {
    const url = new URL(endpoint);
    if (url.protocol !== "https:") return;
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: `[CIOS ${severity.toUpperCase()}] ${title}`, severity, details }),
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
  } catch (error) {
    captureEvent("operations_alert_delivery_failed", "error", {
      extra: { title, error: error instanceof Error ? error.message : String(error) },
    });
  }
}
