import { beforeAll, describe, expect, it } from "vitest";
import type { Inspection } from "@validators";
import { app, readJson, seedDb, setupDb } from "./helpers";

const SECRET = "test-sap-secret"; // matches vitest.config env

const payload = {
  plant_code: "GJ-AHM-01",
  machine_id: "LOOM-14",
  defect_code: "WEAVE",
  severity: "CRITICAL",
  observed_at: "2026-07-28",
  notes: "Detected by loom sensor",
};

function webhook(body: unknown, secret?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (secret) headers["x-webhook-secret"] = secret;
  return app.request("/api/sap/sap-webhook", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

beforeAll(async () => {
  setupDb();
  await seedDb();
});

describe("sap webhook", () => {
  it("rejects a missing/invalid secret with 401", async () => {
    expect((await webhook(payload)).status).toBe(401);
    expect((await webhook(payload, "wrong")).status).toBe(401);
  });

  it("maps a valid payload to a sap-sourced inspection", async () => {
    const res = await webhook(payload, SECRET);
    expect(res.status).toBe(201);
    const row = await readJson<Inspection>(res);
    expect(row.source).toBe("sap");
    expect(row.createdBy).toBeNull(); // no human author
    expect(row.defectType).toBe("weave_defect");
    expect(row.severity).toBe("critical");
    expect(row.inspectionDate).toBe("2026-07-28");
    expect(row.machineLineId).toBe("GJ-AHM-01 / LOOM-14");
    expect(row.remarks).toBe("Detected by loom sensor");
  });

  it("falls back to defectType=other for an unknown defect_code", async () => {
    const res = await webhook({ ...payload, defect_code: "UNKNOWN_XYZ" }, SECRET);
    expect(res.status).toBe(201);
    expect((await readJson<Inspection>(res)).defectType).toBe("other");
  });

  it("returns 422 on an invalid payload", async () => {
    const res = await webhook(
      { ...payload, severity: "SUPER_BAD", observed_at: "nope" },
      SECRET,
    );
    expect(res.status).toBe(422);
  });
});
