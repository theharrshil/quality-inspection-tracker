import type { Inspection } from "@validators";
import type { DefectType } from "@shared/enums";
import { defectTypeLabels } from "@shared/labels";
import { formatDate } from "../lib/format";
import { PendingSyncTag, SeverityBadge, SourceTag, StatusPill } from "./badges";

// A tap-anywhere card (not a desktop table row). `pending` marks an unsynced
// optimistic record from the offline queue.
export function InspectionCard({
  inspection,
  pending = false,
  onClick,
}: {
  inspection: Inspection;
  pending?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-base font-semibold text-slate-900">
          {defectTypeLabels[inspection.defectType as DefectType]}
        </span>
        <SeverityBadge severity={inspection.severity} />
      </div>
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <span className="font-medium text-slate-600">
          {inspection.machineLineId}
        </span>
        <span aria-hidden>•</span>
        <span>{formatDate(inspection.inspectionDate)}</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusPill status={inspection.status} />
        <SourceTag source={inspection.source} />
        {pending && <PendingSyncTag />}
      </div>
    </button>
  );
}
