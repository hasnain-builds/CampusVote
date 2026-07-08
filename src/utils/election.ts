import { ElectionType } from "@/types";

/**
 * Maps standard ElectionType values ('CR', 'BR') to friendly user-facing labels
 */
export function getFriendlyElectionType(type: ElectionType | string | null | undefined): string {
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
