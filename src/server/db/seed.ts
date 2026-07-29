import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import { env } from "@/lib/env";
import { hashPasswordSync } from "@/lib/scrypt";
import { db } from "./client";
import { inspections, users } from "./schema";
import type { NewInspection } from "./schema";

const DAY_MS = 86_400_000;

function daysAgoDate(days: number): string {
  // ISO YYYY-MM-DD, `days` before today.
  return new Date(Date.now() - days * DAY_MS).toISOString().slice(0, 10);
}

function daysAgoMs(days: number): number {
  return Date.now() - days * DAY_MS;
}

function buildInspections(userId: string): NewInspection[] {
  // A realistic mix: all severities, both statuses, recent dates, plausible loom/
  // line ids and fabric-defect content, several resolved with real-sounding notes,
  // and a few SAP-sourced rows (source: "sap", createdBy: null — no human author).
  return [
    {
      inspectionDate: daysAgoDate(0),
      machineLineId: "LOOM-14",
      defectType: "weave_defect",
      severity: "critical",
      remarks: "Broken pick repeating every ~2m across the width.",
      status: "open",
      source: "manual",
      createdBy: userId,
      createdAt: daysAgoMs(0),
      updatedAt: daysAgoMs(0),
    },
    {
      inspectionDate: daysAgoDate(0),
      machineLineId: "RAPIER-03",
      defectType: "shade_variation",
      severity: "major",
      remarks: "Weft bar visible under D65 lightbox on roll #4.",
      status: "open",
      source: "manual",
      createdBy: userId,
      createdAt: daysAgoMs(0),
      updatedAt: daysAgoMs(0),
    },
    {
      inspectionDate: daysAgoDate(1),
      machineLineId: "AIRJET-22",
      defectType: "hole_tear",
      severity: "critical",
      remarks: "Selvedge tear, likely temple damage.",
      status: "resolved",
      resolutionNote: "Replaced temple ring; re-inspected 20m, clean.",
      resolvedAt: daysAgoMs(0),
      resolvedBy: userId,
      source: "manual",
      createdBy: userId,
      createdAt: daysAgoMs(1),
      updatedAt: daysAgoMs(0),
    },
    {
      inspectionDate: daysAgoDate(1),
      machineLineId: "LINE-A2",
      defectType: "count_deviation",
      severity: "minor",
      remarks: "EPI slightly low, within tolerance but flagged.",
      status: "open",
      source: "manual",
      createdBy: userId,
      createdAt: daysAgoMs(1),
      updatedAt: daysAgoMs(1),
    },
    {
      inspectionDate: daysAgoDate(2),
      machineLineId: "SULZER-09",
      defectType: "weave_defect",
      severity: "major",
      remarks: "Float on face, drawing-in error suspected.",
      status: "resolved",
      resolutionNote: "Corrected draft on harness 5; operator re-briefed.",
      resolvedAt: daysAgoMs(1),
      resolvedBy: userId,
      source: "manual",
      createdBy: userId,
      createdAt: daysAgoMs(2),
      updatedAt: daysAgoMs(1),
    },
    {
      inspectionDate: daysAgoDate(2),
      machineLineId: "LOOM-07",
      defectType: "shade_variation",
      severity: "minor",
      remarks: null,
      status: "open",
      source: "manual",
      createdBy: userId,
      createdAt: daysAgoMs(2),
      updatedAt: daysAgoMs(2),
    },
    {
      inspectionDate: daysAgoDate(3),
      machineLineId: "LOOM-14",
      defectType: "hole_tear",
      severity: "major",
      remarks: "Pinhole cluster near left selvedge.",
      status: "resolved",
      resolutionNote: "Traced to worn dropper; dropper bank replaced.",
      resolvedAt: daysAgoMs(2),
      resolvedBy: userId,
      source: "manual",
      createdBy: userId,
      createdAt: daysAgoMs(3),
      updatedAt: daysAgoMs(2),
    },
    {
      inspectionDate: daysAgoDate(3),
      machineLineId: "GJ-AHM-01 / LOOM-14",
      defectType: "weave_defect",
      severity: "critical",
      remarks: "Detected by loom sensor.",
      status: "open",
      source: "sap",
      createdBy: null,
      createdAt: daysAgoMs(3),
      updatedAt: daysAgoMs(3),
    },
    {
      inspectionDate: daysAgoDate(4),
      machineLineId: "RAPIER-03",
      defectType: "count_deviation",
      severity: "major",
      remarks: "PPI drift after beam change.",
      status: "open",
      source: "manual",
      createdBy: userId,
      createdAt: daysAgoMs(4),
      updatedAt: daysAgoMs(4),
    },
    {
      inspectionDate: daysAgoDate(4),
      machineLineId: "AIRJET-22",
      defectType: "shade_variation",
      severity: "critical",
      remarks: "Batch-to-batch dye lot mismatch.",
      status: "resolved",
      resolutionNote: "Re-lotted; affected rolls quarantined for re-dye.",
      resolvedAt: daysAgoMs(3),
      resolvedBy: userId,
      source: "manual",
      createdBy: userId,
      createdAt: daysAgoMs(4),
      updatedAt: daysAgoMs(3),
    },
    {
      inspectionDate: daysAgoDate(5),
      machineLineId: "LINE-B1",
      defectType: "other",
      severity: "minor",
      remarks: "Oil stain, single spot near fold.",
      status: "resolved",
      resolutionNote: "Spot-cleaned; guide roller wiped down.",
      resolvedAt: daysAgoMs(4),
      resolvedBy: userId,
      source: "manual",
      createdBy: userId,
      createdAt: daysAgoMs(5),
      updatedAt: daysAgoMs(4),
    },
    {
      inspectionDate: daysAgoDate(5),
      machineLineId: "SULZER-09",
      defectType: "hole_tear",
      severity: "minor",
      remarks: null,
      status: "open",
      source: "manual",
      createdBy: userId,
      createdAt: daysAgoMs(5),
      updatedAt: daysAgoMs(5),
    },
    {
      inspectionDate: daysAgoDate(6),
      machineLineId: "GJ-AHM-01 / LOOM-07",
      defectType: "count_deviation",
      severity: "major",
      remarks: "Detected by loom sensor.",
      status: "open",
      source: "sap",
      createdBy: null,
      createdAt: daysAgoMs(6),
      updatedAt: daysAgoMs(6),
    },
    {
      inspectionDate: daysAgoDate(7),
      machineLineId: "LOOM-14",
      defectType: "weave_defect",
      severity: "major",
      remarks: "Reed mark, faint vertical line.",
      status: "resolved",
      resolutionNote: "Reed cleaned and re-dented; mark cleared.",
      resolvedAt: daysAgoMs(6),
      resolvedBy: userId,
      source: "manual",
      createdBy: userId,
      createdAt: daysAgoMs(7),
      updatedAt: daysAgoMs(6),
    },
    {
      inspectionDate: daysAgoDate(8),
      machineLineId: "RAPIER-03",
      defectType: "shade_variation",
      severity: "minor",
      remarks: "Slight tailing at roll end.",
      status: "resolved",
      resolutionNote: "Within spec after re-check; released.",
      resolvedAt: daysAgoMs(7),
      resolvedBy: userId,
      source: "manual",
      createdBy: userId,
      createdAt: daysAgoMs(8),
      updatedAt: daysAgoMs(7),
    },
    {
      inspectionDate: daysAgoDate(9),
      machineLineId: "AIRJET-22",
      defectType: "hole_tear",
      severity: "critical",
      remarks: "Through-hole, 3cm, mid-width.",
      status: "resolved",
      resolutionNote: "Roll cut and downgraded; root cause logged.",
      resolvedAt: daysAgoMs(8),
      resolvedBy: userId,
      source: "manual",
      createdBy: userId,
      createdAt: daysAgoMs(9),
      updatedAt: daysAgoMs(8),
    },
    {
      inspectionDate: daysAgoDate(11),
      machineLineId: "LINE-A2",
      defectType: "other",
      severity: "major",
      remarks: "Crease set from improper batching.",
      status: "open",
      source: "manual",
      createdBy: userId,
      createdAt: daysAgoMs(11),
      updatedAt: daysAgoMs(11),
    },
    {
      inspectionDate: daysAgoDate(12),
      machineLineId: "LOOM-07",
      defectType: "weave_defect",
      severity: "minor",
      remarks: "Isolated missing end, self-corrected.",
      status: "resolved",
      resolutionNote: "Single end tied back in; no recurrence.",
      resolvedAt: daysAgoMs(11),
      resolvedBy: userId,
      source: "manual",
      createdBy: userId,
      createdAt: daysAgoMs(12),
      updatedAt: daysAgoMs(11),
    },
    {
      inspectionDate: daysAgoDate(14),
      machineLineId: "GJ-AHM-01 / AIRJET-22",
      defectType: "other",
      severity: "minor",
      remarks: "Detected by loom sensor.",
      status: "open",
      source: "sap",
      createdBy: null,
      createdAt: daysAgoMs(14),
      updatedAt: daysAgoMs(14),
    },
    {
      inspectionDate: daysAgoDate(16),
      machineLineId: "SULZER-09",
      defectType: "count_deviation",
      severity: "minor",
      remarks: "Minor PPI variance on startup meters.",
      status: "resolved",
      resolutionNote: "Startup waste trimmed; balance of roll OK.",
      resolvedAt: daysAgoMs(15),
      resolvedBy: userId,
      source: "manual",
      createdBy: userId,
      createdAt: daysAgoMs(16),
      updatedAt: daysAgoMs(15),
    },
  ];
}

// Inserts the seed user + inspections. Assumes the tables are empty (see seedIfEmpty
// / db:reset). Returns the number of inspections created.
export async function seed(): Promise<{ userId: string; inspections: number }> {
  const passwordHash = hashPasswordSync(env.SEED_PASSWORD);
  const user = db
    .insert(users)
    .values({ username: env.SEED_USERNAME, passwordHash })
    .returning()
    .get();

  if (!user) throw new Error("Failed to seed user");

  const rows = buildInspections(user.id);
  db.insert(inspections).values(rows).run();

  return { userId: user.id, inspections: rows.length };
}

// Runs the seed only when the database has no users — safe to call on every startup
// so a fresh clone shows populated data with zero extra steps.
export async function seedIfEmpty(): Promise<void> {
  const row = db.select({ count: sql<number>`count(*)` }).from(users).get();
  if (row && row.count > 0) return;
  const result = await seed();
  console.log(
    `✔ Seeded ${result.inspections} inspections and user "${env.SEED_USERNAME}"`,
  );
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  seed()
    .then((r) => {
      console.log(`✔ Seeded ${r.inspections} inspections`);
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
