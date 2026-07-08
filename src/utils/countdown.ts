/**
 * Shared countdown utilities.
 *
 * Every timer in the application MUST use these functions.
 * The ONLY source of truth for remaining time is `end_time` from the database.
 * Never compute remaining time from `duration_minutes` or `voting_started_at`.
 */

/**
 * Parse a date string safely as UTC, even if it lacks a "Z" or timezone offset (e.g. from CDC payloads).
 */
export function parseUTCDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  let formatted = dateStr.trim();
  // If it doesn't contain a timezone specifier (Z or +xx or -xx), append Z to force UTC parsing
  if (!formatted.endsWith("Z") && !/[+-]\d{2}(:\d{2})?$/.test(formatted)) {
    formatted = formatted.replace(" ", "T");
    if (!formatted.endsWith("Z")) {
      formatted += "Z";
    }
  }
  const d = new Date(formatted);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Compute the number of whole seconds remaining until `endTime`.
 * Returns 0 if endTime is null/undefined or already in the past.
 */
export function getRemainingSeconds(endTime: string | null | undefined): number {
  const d = parseUTCDate(endTime);
  if (!d) return 0;
  const remaining = Math.floor((d.getTime() - Date.now()) / 1000);
  return Math.max(0, remaining);
}

/**
 * Format a total-seconds value as "m:ss".
 */
export function formatTime(totalSecs: number): string {
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
