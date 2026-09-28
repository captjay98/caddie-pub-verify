// Honest time formatters (pattern borrowed from HackSteward's brief_presentation).
// A missing value renders as an explicit unknown — never a plausible number.

export const UNKNOWN = "—";

export function formatTimeUntil(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return UNKNOWN;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return UNKNOWN;
  const deltaMs = date.getTime() - now.getTime();
  if (deltaMs < 0) return "overdue";
  const minutes = Math.floor(deltaMs / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

export function formatTimeAgo(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return UNKNOWN;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return UNKNOWN;
  const deltaMs = now.getTime() - date.getTime();
  if (deltaMs < 0) return "scheduled";
  const minutes = Math.floor(deltaMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
