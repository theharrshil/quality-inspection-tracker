import { type SQL, and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";
import { inspections } from "@/db/schema";
import type { AppRouteHandler } from "@/lib/types";
import type {
  CreateRoute,
  GetOneRoute,
  ListRoute,
  ResolveRoute,
} from "./inspections.routes";

// Orders critical > major > minor for the `severity` sort.
const severityRank = sql`case ${inspections.severity} when 'critical' then 3 when 'major' then 2 when 'minor' then 1 else 0 end`;

function orderClause(sort: string): SQL[] {
  switch (sort) {
    case "createdAt":
      return [asc(inspections.createdAt)];
    case "severity":
      return [desc(severityRank), desc(inspections.createdAt)];
    case "inspectionDate":
      return [desc(inspections.inspectionDate), desc(inspections.createdAt)];
    case "-createdAt":
    default:
      return [desc(inspections.createdAt)];
  }
}

export const list: AppRouteHandler<ListRoute> = (c) => {
  const q = c.req.valid("query");
  const db = c.var.db;

  const conditions: SQL[] = [];
  if (q.severity) conditions.push(eq(inspections.severity, q.severity));
  if (q.status) conditions.push(eq(inspections.status, q.status));
  if (q.defectType) conditions.push(eq(inspections.defectType, q.defectType));
  if (q.from) conditions.push(gte(inspections.inspectionDate, q.from));
  if (q.to) conditions.push(lte(inspections.inspectionDate, q.to));
  const where = conditions.length ? and(...conditions) : undefined;

  const data = db
    .select()
    .from(inspections)
    .where(where)
    .orderBy(...orderClause(q.sort))
    .limit(q.limit)
    .offset(q.offset)
    .all();

  const totalRow = db
    .select({ count: sql<number>`count(*)` })
    .from(inspections)
    .where(where)
    .get();

  return c.json(
    { data, meta: { total: totalRow?.count ?? 0 } },
    HttpStatusCodes.OK,
  );
};

export const create: AppRouteHandler<CreateRoute> = (c) => {
  const input = c.req.valid("json");
  const db = c.var.db;

  // Idempotent replay: a client-supplied id that already exists returns the
  // stored row unchanged (safe offline resends).
  if (input.id) {
    const existing = db
      .select()
      .from(inspections)
      .where(eq(inspections.id, input.id))
      .get();
    if (existing) return c.json(existing, HttpStatusCodes.OK);
  }

  const now = Date.now();
  const row = db
    .insert(inspections)
    .values({
      ...input,
      source: "manual",
      createdBy: c.var.user.id, // server-stamped, never from the body
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();

  if (!row) throw new Error("Insert failed to return a row");
  return c.json(row, HttpStatusCodes.CREATED);
};

export const getOne: AppRouteHandler<GetOneRoute> = (c) => {
  const { id } = c.req.valid("param");
  const row = c.var.db
    .select()
    .from(inspections)
    .where(eq(inspections.id, id))
    .get();

  if (!row) {
    return c.json(
      { message: HttpStatusPhrases.NOT_FOUND },
      HttpStatusCodes.NOT_FOUND,
    );
  }
  return c.json(row, HttpStatusCodes.OK);
};

export const resolve: AppRouteHandler<ResolveRoute> = (c) => {
  const { id } = c.req.valid("param");
  const { resolutionNote } = c.req.valid("json");
  const db = c.var.db;

  const existing = db
    .select()
    .from(inspections)
    .where(eq(inspections.id, id))
    .get();

  if (!existing) {
    return c.json(
      { message: HttpStatusPhrases.NOT_FOUND },
      HttpStatusCodes.NOT_FOUND,
    );
  }
  if (existing.status === "resolved") {
    return c.json(
      { message: "Inspection is already resolved" },
      HttpStatusCodes.CONFLICT,
    );
  }

  const now = Date.now();
  const row = db
    .update(inspections)
    .set({
      status: "resolved",
      resolutionNote,
      resolvedAt: now,
      resolvedBy: c.var.user.id, // server-stamped
      updatedAt: now,
    })
    .where(eq(inspections.id, id))
    .returning()
    .get();

  if (!row) throw new Error("Update failed to return a row");
  return c.json(row, HttpStatusCodes.OK);
};
