import * as HttpStatusCodes from "stoker/http-status-codes";
import type { DefectType, Severity } from "@shared/enums";
import { inspections } from "@/db/schema";
import type { AppRouteHandler } from "@/lib/types";
import type { WebhookRoute } from "./sap.routes";

// SAP defect_code → our defectType. Unknown codes fall back to "other".
const DEFECT_CODE_MAP: Record<string, DefectType> = {
  WEAVE: "weave_defect",
  SHADE: "shade_variation",
  HOLE: "hole_tear",
  TEAR: "hole_tear",
  COUNT: "count_deviation",
};

const SEVERITY_MAP: Record<"CRITICAL" | "MAJOR" | "MINOR", Severity> = {
  CRITICAL: "critical",
  MAJOR: "major",
  MINOR: "minor",
};

export const webhook: AppRouteHandler<WebhookRoute> = (c) => {
  const payload = c.req.valid("json");
  const now = Date.now();

  const row = c.var.db
    .insert(inspections)
    .values({
      inspectionDate: payload.observed_at,
      machineLineId: `${payload.plant_code} / ${payload.machine_id}`,
      defectType: DEFECT_CODE_MAP[payload.defect_code.toUpperCase()] ?? "other",
      severity: SEVERITY_MAP[payload.severity],
      remarks: payload.notes ?? null,
      source: "sap",
      createdBy: null, // no human author for SAP-sourced rows
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();

  if (!row) throw new Error("Insert failed to return a row");
  return c.json(row, HttpStatusCodes.CREATED);
};
