import { useState } from "react";
import {
  DEFECT_TYPES,
  SEVERITIES,
  SORT_OPTIONS,
  STATUSES,
} from "@shared/enums";
import { defectTypeLabels, severityLabels, statusLabels } from "@shared/labels";
import type { ListFilters } from "../lib/queries";

const sortLabels: Record<(typeof SORT_OPTIONS)[number], string> = {
  "-createdAt": "Newest first",
  createdAt: "Oldest first",
  severity: "By severity",
  inspectionDate: "By inspection date",
};

const selectClass =
  "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

export function FilterBar({
  filters,
  onChange,
  onClear,
}: {
  filters: ListFilters;
  onChange: (key: string, value: string) => void;
  onClear: () => void;
}) {
  const [showDates, setShowDates] = useState(
    Boolean(filters.from || filters.to),
  );

  const activeCount = ["severity", "status", "defectType", "from", "to"].filter(
    (k) => filters[k],
  ).length;

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 md:p-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <select
          aria-label="Filter by severity"
          className={selectClass}
          value={filters.severity ?? ""}
          onChange={(e) => onChange("severity", e.target.value)}
        >
          <option value="">All severities</option>
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {severityLabels[s]}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by status"
          className={selectClass}
          value={filters.status ?? ""}
          onChange={(e) => onChange("status", e.target.value)}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabels[s]}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by defect type"
          className={selectClass}
          value={filters.defectType ?? ""}
          onChange={(e) => onChange("defectType", e.target.value)}
        >
          <option value="">All defect types</option>
          {DEFECT_TYPES.map((d) => (
            <option key={d} value={d}>
              {defectTypeLabels[d]}
            </option>
          ))}
        </select>

        <select
          aria-label="Sort order"
          className={selectClass}
          value={filters.sort ?? "-createdAt"}
          onChange={(e) => onChange("sort", e.target.value)}
        >
          {SORT_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {sortLabels[s]}
            </option>
          ))}
        </select>
      </div>

      {showDates && (
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs font-medium text-slate-500">
            From
            <input
              type="date"
              className={selectClass}
              value={filters.from ?? ""}
              onChange={(e) => onChange("from", e.target.value)}
            />
          </label>
          <label className="text-xs font-medium text-slate-500">
            To
            <input
              type="date"
              className={selectClass}
              value={filters.to ?? ""}
              onChange={(e) => onChange("to", e.target.value)}
            />
          </label>
        </div>
      )}

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          className="font-medium text-indigo-600"
          onClick={() => setShowDates((v) => !v)}
        >
          {showDates ? "Hide date range" : "Date range"}
        </button>
        {activeCount > 0 && (
          <button
            type="button"
            className="font-medium text-slate-500"
            onClick={() => {
              setShowDates(false);
              onClear();
            }}
          >
            Clear filters ({activeCount})
          </button>
        )}
      </div>
    </div>
  );
}
