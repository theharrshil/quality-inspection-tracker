import { SEVERITIES } from "@shared/enums";
import { severityLabels } from "@shared/labels";
import { ApiError } from "../lib/api";
import { useSummary } from "../lib/queries";
import { severityStyles } from "../lib/format";
import { ErrorState, LoadingState, PageHeader } from "../components/ui";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col">
      <span className="text-2xl font-bold text-slate-900">{value}</span>
      <span className="text-xs font-medium text-slate-500">{label}</span>
    </div>
  );
}

export function Summary() {
  const query = useSummary();

  return (
    <div className="flex flex-col">
      <PageHeader title="Summary" />

      {query.isPending ? (
        <LoadingState label="Loading summary…" />
      ) : query.isError ? (
        <ErrorState
          message={
            query.error instanceof ApiError
              ? query.error.message
              : "Could not load the summary."
          }
          onRetry={() => void query.refetch()}
        />
      ) : (
        <div className="flex flex-col gap-4 p-4">
          <div className="grid grid-cols-3 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <Stat label="Open" value={query.data.totals.open} />
            <Stat label="Resolved" value={query.data.totals.resolved} />
            <Stat label="Total" value={query.data.totals.total} />
          </div>

          <div className="flex flex-col gap-3">
            {SEVERITIES.map((severity) => {
              const counts = query.data.bySeverity[severity];
              return (
                <div
                  key={severity}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${severityStyles[severity]}`}
                    >
                      {severityLabels[severity]}
                    </span>
                    <span className="text-sm text-slate-400">
                      {counts.open + counts.resolved} total
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-indigo-50 p-3">
                      <div className="text-xl font-bold text-indigo-700">
                        {counts.open}
                      </div>
                      <div className="text-xs font-medium text-indigo-600/80">
                        Open
                      </div>
                    </div>
                    <div className="rounded-xl bg-emerald-50 p-3">
                      <div className="text-xl font-bold text-emerald-700">
                        {counts.resolved}
                      </div>
                      <div className="text-xs font-medium text-emerald-600/80">
                        Resolved
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
