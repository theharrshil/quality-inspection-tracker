// Human-readable labels for the domain enums, used by the client UI. Pure and
// isomorphic (only imports types), so it is safe in the browser bundle.
import type { DefectType, Severity, Status, Source } from "./enums";

export const defectTypeLabels: Record<DefectType, string> = {
  weave_defect: "Weave defect",
  shade_variation: "Shade variation",
  hole_tear: "Hole / tear",
  count_deviation: "Count deviation",
  other: "Other",
};

export const severityLabels: Record<Severity, string> = {
  critical: "Critical",
  major: "Major",
  minor: "Minor",
};

export const statusLabels: Record<Status, string> = {
  open: "Open",
  resolved: "Resolved",
};

export const sourceLabels: Record<Source, string> = {
  manual: "Manual",
  sap: "SAP",
};
