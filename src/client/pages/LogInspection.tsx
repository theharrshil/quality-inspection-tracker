import { useState, type FormEvent } from "react";
import { DEFECT_TYPES, SEVERITIES } from "@shared/enums";
import type { DefectType, Severity } from "@shared/enums";
import { defectTypeLabels, severityLabels } from "@shared/labels";
import { ApiError } from "../lib/api";
import { useCreateInspection } from "../lib/queries";
import { useRouter } from "../lib/router";
import { todayISO } from "../lib/format";
import { SegmentedControl } from "../components/SegmentedControl";
import { Button, Field, PageHeader } from "../components/ui";

const inputClass =
  "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

// Per-severity active colors so the choice is unmistakable.
const severityActive: Record<Severity, string> = {
  critical: "border-red-600 bg-red-600 text-white",
  major: "border-amber-500 bg-amber-500 text-white",
  minor: "border-slate-500 bg-slate-500 text-white",
};

export function LogInspection() {
  const { navigate, back } = useRouter();
  const create = useCreateInspection();

  const [inspectionDate, setInspectionDate] = useState(todayISO());
  const [machineLineId, setMachineLineId] = useState("");
  const [defectType, setDefectType] = useState<DefectType | null>(null);
  const [severity, setSeverity] = useState<Severity | null>(null);
  const [remarks, setRemarks] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const errors = {
    machineLineId: machineLineId.trim() ? undefined : "Machine / line is required",
    defectType: defectType ? undefined : "Select a defect type",
    severity: severity ? undefined : "Select a severity",
    inspectionDate: inspectionDate ? undefined : "Date is required",
  };
  const isValid = Object.values(errors).every((e) => !e);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (!isValid || !defectType || !severity) {
      setShowErrors(true);
      return;
    }
    try {
      const result = await create.mutateAsync({
        id: crypto.randomUUID(), // client-generated for offline idempotency
        inspectionDate,
        machineLineId: machineLineId.trim(),
        defectType,
        severity,
        remarks: remarks.trim() ? remarks.trim() : null,
      });
      // Queued offline → show it in the list (with a pending marker); otherwise
      // jump straight to the saved record.
      navigate(result.queued ? "/" : `/inspections/${result.inspection.id}`);
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : "Could not save. Try again.",
      );
    }
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Log inspection"
        left={
          <button
            type="button"
            onClick={back}
            className="min-h-11 px-1 text-sm font-medium text-indigo-600"
          >
            Cancel
          </button>
        }
      />

      <form onSubmit={onSubmit} className="flex flex-col gap-5 p-4">
        <Field
          label="Inspection date"
          htmlFor="date"
          error={showErrors ? errors.inspectionDate : undefined}
        >
          <input
            id="date"
            type="date"
            max={todayISO()}
            className={inputClass}
            value={inspectionDate}
            onChange={(e) => setInspectionDate(e.target.value)}
          />
        </Field>

        <Field
          label="Machine / line"
          htmlFor="machine"
          error={showErrors ? errors.machineLineId : undefined}
        >
          <input
            id="machine"
            className={inputClass}
            placeholder="e.g. LOOM-14"
            value={machineLineId}
            onChange={(e) => setMachineLineId(e.target.value)}
          />
        </Field>

        <Field
          label="Defect type"
          error={showErrors ? errors.defectType : undefined}
        >
          <SegmentedControl
            columns={2}
            value={defectType}
            onChange={setDefectType}
            options={DEFECT_TYPES.map((d) => ({
              value: d,
              label: defectTypeLabels[d],
            }))}
          />
        </Field>

        <Field
          label="Severity"
          error={showErrors ? errors.severity : undefined}
        >
          <SegmentedControl
            columns={3}
            value={severity}
            onChange={setSeverity}
            options={SEVERITIES.map((s) => ({
              value: s,
              label: severityLabels[s],
              activeClass: severityActive[s],
            }))}
          />
        </Field>

        <Field label="Remarks (optional)" htmlFor="remarks">
          <textarea
            id="remarks"
            rows={3}
            className={`${inputClass} py-2`}
            placeholder="What did you observe?"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
        </Field>

        {submitError && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-600/20">
            {submitError}
          </p>
        )}

        <Button
          type="submit"
          disabled={create.isPending}
          className="w-full"
        >
          {create.isPending ? "Saving…" : "Submit inspection"}
        </Button>
      </form>
    </div>
  );
}
