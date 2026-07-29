import { useState, type FormEvent } from "react";
import type { DefectType } from "@shared/enums";
import { defectTypeLabels } from "@shared/labels";
import { ApiError } from "../lib/api";
import { useInspection, useResolveInspection } from "../lib/queries";
import { useOffline } from "../lib/useOffline";
import { useRouter } from "../lib/router";
import { formatDate, formatDateTime } from "../lib/format";
import { SeverityBadge, SourceTag, StatusPill } from "../components/badges";
import {
  Button,
  ErrorState,
  Field,
  LoadingState,
  PageHeader,
} from "../components/ui";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2.5">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-medium text-slate-800">
        {value}
      </span>
    </div>
  );
}

export function InspectionDetail({ id }: { id: string }) {
  const { back } = useRouter();
  const query = useInspection(id);
  const resolve = useResolveInspection(id);
  const { pendingResolveIds } = useOffline();

  const [note, setNote] = useState("");
  const [showError, setShowError] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function onResolve(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (!note.trim()) {
      setShowError(true);
      return;
    }
    try {
      const res = await resolve.mutateAsync(note.trim());
      // Queued offline → the server still shows it open; go back to the list where
      // the pending resolution is reflected.
      if (res.queued) back();
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : "Could not resolve. Try again.",
      );
    }
  }

  const backButton = (
    <button
      type="button"
      onClick={back}
      className="min-h-11 px-1 text-sm font-medium text-indigo-600"
    >
      ‹ Back
    </button>
  );

  if (query.isPending) {
    return (
      <div>
        <PageHeader title="Inspection" left={backButton} />
        <LoadingState />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div>
        <PageHeader title="Inspection" left={backButton} />
        <ErrorState
          message={
            query.error instanceof ApiError && query.error.status === 404
              ? "This inspection no longer exists."
              : "Could not load this inspection."
          }
          onRetry={() => void query.refetch()}
        />
      </div>
    );
  }

  const item = query.data;

  return (
    <div className="flex flex-col">
      <PageHeader title="Inspection" left={backButton} />

      <div className="flex flex-col gap-4 p-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-start justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-900">
              {defectTypeLabels[item.defectType as DefectType]}
            </h2>
            <SeverityBadge severity={item.severity} />
          </div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            <StatusPill status={item.status} />
            <SourceTag source={item.source} />
          </div>
          <div className="divide-y divide-slate-100">
            <Row label="Machine / line" value={item.machineLineId} />
            <Row label="Inspection date" value={formatDate(item.inspectionDate)} />
            <Row label="Logged" value={formatDateTime(item.createdAt)} />
            {item.remarks && <Row label="Remarks" value={item.remarks} />}
          </div>
        </div>

        {item.status === "resolved" ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <h3 className="mb-1 text-sm font-semibold text-emerald-800">
              Resolution
            </h3>
            <p className="text-sm text-emerald-900">{item.resolutionNote}</p>
            {item.resolvedAt && (
              <p className="mt-2 text-xs text-emerald-700">
                Resolved {formatDateTime(item.resolvedAt)}
              </p>
            )}
          </div>
        ) : pendingResolveIds.has(item.id) ? (
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
            <h3 className="mb-1 text-sm font-semibold text-orange-800">
              Resolution pending sync
            </h3>
            <p className="text-sm text-orange-900">
              This resolution was recorded offline and will be submitted when you
              reconnect.
            </p>
          </div>
        ) : (
          <form
            onSubmit={onResolve}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <h3 className="mb-3 text-sm font-semibold text-slate-900">
              Mark as resolved
            </h3>
            <Field
              label="Resolution note"
              htmlFor="note"
              error={
                showError && !note.trim()
                  ? "A resolution note is required"
                  : undefined
              }
            >
              <textarea
                id="note"
                rows={3}
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                placeholder="What was done to resolve this defect?"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>
            {submitError && (
              <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                {submitError}
              </p>
            )}
            <Button
              type="submit"
              disabled={resolve.isPending}
              className="mt-3 w-full"
            >
              {resolve.isPending ? "Resolving…" : "Mark resolved"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
