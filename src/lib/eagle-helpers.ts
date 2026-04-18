/** Client-safe Eagle Project helpers — no DB imports, no "use server". */

/** Returns the deadline Date for the current week's Eagle Project (Tuesday 19:45 WAT).
 *  WAT is UTC+1, so 19:45 WAT = 18:45 UTC. */
export function getEagleDeadline(): Date {
  const now = new Date();
  // Find next (or current) Tuesday
  const day = now.getUTCDay(); // 0=Sun, 2=Tue
  const daysUntilTue = day <= 2 ? 2 - day : 9 - day;
  const tuesday = new Date(now);
  tuesday.setUTCDate(now.getUTCDate() + daysUntilTue);
  tuesday.setUTCHours(18, 45, 0, 0); // 19:45 WAT = 18:45 UTC
  return tuesday;
}

export function isPastEagleDeadline(): boolean {
  return new Date() > getEagleDeadline();
}
