/**
 * Shared human time formatting so every card speaks the same dialect.
 * Replace ad-hoc `new Date(…).toLocaleString()` calls with these.
 */

/** "just now" · "5m" · "2h" · "Yesterday" · "3d" · "Apr 12" · "Apr 12, 2023" */
export function timeAgo(iso: string | Date | number): string {
  const d = typeof iso === "string" || typeof iso === "number" ? new Date(iso) : iso;
  const ms = Date.now() - d.getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 45) return "just now";
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const day = Math.floor(h / 24);
  if (day === 1) return "Yesterday";
  if (day < 7) return `${day}d`;
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString(undefined, sameYear
    ? { month: "short", day: "numeric" }
    : { month: "short", day: "numeric", year: "numeric" });
}

/** Due-in style for tasks: "Due in 3h", "Due in 2 days", "Overdue 1d", "Today". */
export function dueIn(iso: string | Date | number): { label: string; tone: "ok" | "warn" | "late" } {
  const d = typeof iso === "string" || typeof iso === "number" ? new Date(iso) : iso;
  const ms = d.getTime() - Date.now();
  if (ms < 0) {
    const abs = Math.abs(ms);
    const day = Math.floor(abs / 86400000);
    const hr = Math.floor(abs / 3600000);
    return { label: day > 0 ? `Overdue ${day}d` : `Overdue ${hr}h`, tone: "late" };
  }
  const hr = Math.floor(ms / 3600000);
  const day = Math.floor(ms / 86400000);
  if (hr < 1) return { label: "Due soon", tone: "warn" };
  if (hr < 24) return { label: `Due in ${hr}h`, tone: hr < 6 ? "warn" : "ok" };
  if (day === 1) return { label: "Due tomorrow", tone: "ok" };
  if (day < 7) return { label: `Due in ${day} days`, tone: "ok" };
  return { label: `Due ${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`, tone: "ok" };
}

/** "3:42 PM" */
export function timeOfDay(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
