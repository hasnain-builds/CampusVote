import { ElectionType } from "@/types";

/**
 * Maps standard ElectionType values ('CR', 'BR') to friendly user-facing labels
 */
export function getFriendlyElectionType(
  type: ElectionType | string | null | undefined,
  title?: string | null
): string {
  if (title && title.trim()) {
    return title.trim();
  }
  if (!type) return "N/A";
  switch (type) {
    case "CR":
      return "Class Representative";
    case "BR":
      return "Batch Representative";
    default:
      return type;
  }
}
