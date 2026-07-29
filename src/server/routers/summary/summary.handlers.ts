import { sql } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { inspections } from "@/db/schema";
import type { Severity, Status } from "@shared/enums";
import type { Summary } from "@validators";
import type { AppRouteHandler } from "@/lib/types";
import type { GetSummaryRoute } from "./summary.routes";

export const get: AppRouteHandler<GetSummaryRoute> = (c) => {
  // One grouped aggregation, not a full row scan.
  const rows = c.var.db
    .select({
      severity: inspections.severity,
      status: inspections.status,
      count: sql<number>`count(*)`,
    })
    .from(inspections)
    .groupBy(inspections.severity, inspections.status)
    .all();

  const summary: Summary = {
    bySeverity: {
      critical: { open: 0, resolved: 0 },
      major: { open: 0, resolved: 0 },
      minor: { open: 0, resolved: 0 },
    },
    totals: { open: 0, resolved: 0, total: 0 },
  };

  for (const row of rows) {
    const severity = row.severity as Severity;
    const status = row.status as Status;
    summary.bySeverity[severity][status] = row.count;
    summary.totals[status] += row.count;
  }
  summary.totals.total = summary.totals.open + summary.totals.resolved;

  return c.json(summary, HttpStatusCodes.OK);
};
