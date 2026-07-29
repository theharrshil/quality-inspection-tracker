import { beforeAll, describe, expect, it } from "vitest";
import type { Inspection, Summary } from "@validators";
import { extractRefreshToken, readJson, request, seedDb, setupDb } from "./helpers";

let token = "";

interface ListBody {
  data: Inspection[];
  meta: { total: number };
}

beforeAll(async () => {
  setupDb();
  await seedDb();
  const res = await request("POST", "/api/auth/login", {
    json: { username: "supervisor", password: "inspect123" },
  });
  token = (await readJson<{ accessToken: string }>(res)).accessToken;
  // touch to satisfy unused import in some paths
  void extractRefreshToken;
});

const validBody = () => ({
  id: crypto.randomUUID(),
  inspectionDate: "2026-07-29",
  machineLineId: "LOOM-99",
  defectType: "weave_defect" as const,
  severity: "critical" as const,
  remarks: "Test defect",
});

describe("inspections", () => {
  it("requires authentication", async () => {
    const res = await request("GET", "/api/inspections");
    expect(res.status).toBe(401);
  });

  it("runs the full happy path: create → list → get → resolve → summary", async () => {
    const body = validBody();

    // create
    const created = await request("POST", "/api/inspections", {
      token,
      json: body,
    });
    expect(created.status).toBe(201);
    const row = await readJson<Inspection>(created);
    expect(row.id).toBe(body.id);
    expect(row.status).toBe("open");
    expect(row.source).toBe("manual");
    expect(row.createdBy).toBeTruthy(); // stamped from token
    expect(row.resolvedAt).toBeNull();

    // idempotent replay → 200 with same row
    const replay = await request("POST", "/api/inspections", {
      token,
      json: body,
    });
    expect(replay.status).toBe(200);
    expect((await readJson<Inspection>(replay)).id).toBe(body.id);

    // list (envelope + total) and severity filter
    const listed = await request("GET", "/api/inspections?severity=critical", {
      token,
    });
    expect(listed.status).toBe(200);
    const list = await readJson<ListBody>(listed);
    expect(Array.isArray(list.data)).toBe(true);
    expect(list.meta.total).toBeGreaterThan(0);
    expect(list.data.every((i) => i.severity === "critical")).toBe(true);

    // get one
    const one = await request("GET", `/api/inspections/${body.id}`, { token });
    expect(one.status).toBe(200);
    expect((await readJson<Inspection>(one)).id).toBe(body.id);

    // resolve
    const resolved = await request(
      "PATCH",
      `/api/inspections/${body.id}/resolve`,
      { token, json: { resolutionNote: "Fixed the loom timing." } },
    );
    expect(resolved.status).toBe(200);
    const resolvedRow = await readJson<Inspection>(resolved);
    expect(resolvedRow.status).toBe("resolved");
    expect(resolvedRow.resolutionNote).toBe("Fixed the loom timing.");
    expect(resolvedRow.resolvedAt).toBeTruthy();
    expect(resolvedRow.resolvedBy).toBeTruthy();

    // resolve again → 409
    const again = await request("PATCH", `/api/inspections/${body.id}/resolve`, {
      token,
      json: { resolutionNote: "Second attempt" },
    });
    expect(again.status).toBe(409);

    // summary reflects totals
    const summaryRes = await request("GET", "/api/summary", { token });
    expect(summaryRes.status).toBe(200);
    const summary = await readJson<Summary>(summaryRes);
    expect(summary.totals.total).toBe(
      summary.totals.open + summary.totals.resolved,
    );
    expect(summary.bySeverity.critical.resolved).toBeGreaterThan(0);
  });

  it("returns 404 for an unknown id", async () => {
    const res = await request("GET", `/api/inspections/${crypto.randomUUID()}`, {
      token,
    });
    expect(res.status).toBe(404);
  });

  it("returns 422 when resolving with an empty note", async () => {
    const body = validBody();
    await request("POST", "/api/inspections", { token, json: body });
    const res = await request("PATCH", `/api/inspections/${body.id}/resolve`, {
      token,
      json: { resolutionNote: "" },
    });
    expect(res.status).toBe(422);
    const err = await readJson<{ success: boolean; error: { name: string } }>(res);
    expect(err.success).toBe(false);
    expect(err.error.name).toBe("ZodError");
  });

  it("returns 422 on an invalid create body", async () => {
    const res = await request("POST", "/api/inspections", {
      token,
      json: { inspectionDate: "not-a-date", machineLineId: "X" },
    });
    expect(res.status).toBe(422);
    expect((await readJson<{ success: boolean }>(res)).success).toBe(false);
  });
});
