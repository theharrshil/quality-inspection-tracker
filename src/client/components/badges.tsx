import type { Severity, Source, Status } from "@shared/enums";
import {
  severityLabels,
  sourceLabels,
  statusLabels,
} from "@shared/labels";
import { severityStyles, statusStyles } from "../lib/format";

const pill =
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold";

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={`${pill} ${severityStyles[severity]}`}>
      {severityLabels[severity]}
    </span>
  );
}

export function StatusPill({ status }: { status: Status }) {
  return (
    <span className={`${pill} ${statusStyles[status]}`}>
      {statusLabels[status]}
    </span>
  );
}

export function SourceTag({ source }: { source: Source }) {
  if (source !== "sap") return null;
  return (
    <span className={`${pill} bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20`}>
      {sourceLabels[source]}
    </span>
  );
}

// Small marker for records that have not yet synced to the server (offline bonus).
export function PendingSyncTag() {
  return (
    <span
      className={`${pill} bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20`}
    >
      ⧗ Pending sync
    </span>
  );
}
