import type { Severity, Status } from "@shared/enums";

// Tailwind class sets for the color-coded badges (spec: Critical=red, Major=amber,
// Minor=slate).
export const severityStyles: Record<Severity, string> = {
  critical: "bg-red-100 text-red-700 ring-1 ring-inset ring-red-600/20",
  major: "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-600/20",
  minor: "bg-slate-200 text-slate-700 ring-1 ring-inset ring-slate-500/20",
};

export const statusStyles: Record<Status, string> = {
  open: "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20",
  resolved: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20",
};

export function formatDate(iso: string): string {
  // iso is YYYY-MM-DD; render as e.g. "29 Jul 2026" without timezone drift.
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatDateTime(ms: number): string {
  return new Date(ms).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
