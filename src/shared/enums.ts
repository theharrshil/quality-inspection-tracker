// Single source of truth for the domain enums. Pure and isomorphic — no drizzle,
// no node imports — so both the server schema and the client bundle can use it.

export const DEFECT_TYPES = [
  "weave_defect",
  "shade_variation",
  "hole_tear",
  "count_deviation",
  "other",
] as const;
export type DefectType = (typeof DEFECT_TYPES)[number];

export const SEVERITIES = ["critical", "major", "minor"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const STATUSES = ["open", "resolved"] as const;
export type Status = (typeof STATUSES)[number];

export const SOURCES = ["manual", "sap"] as const;
export type Source = (typeof SOURCES)[number];

// Accepted values for the list `sort` query param. `-` prefix = descending.
export const SORT_OPTIONS = [
  "-createdAt",
  "createdAt",
  "severity",
  "inspectionDate",
] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];
export const DEFAULT_SORT: SortOption = "-createdAt";

// Severity ranked high→low, used for the `severity` sort (critical > major > minor).
export const SEVERITY_RANK: Record<Severity, number> = {
  critical: 3,
  major: 2,
  minor: 1,
};
