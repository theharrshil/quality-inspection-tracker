// Importing z from @hono/zod-openapi ensures the zod prototype is extended with
// .openapi() (via zod-to-openapi) before we attach metadata to schemas below.
import { z } from "@hono/zod-openapi";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { inspections, users } from "@/db/schema";
import {
  DEFECT_TYPES,
  SEVERITIES,
  SORT_OPTIONS,
  STATUSES,
  DEFAULT_SORT,
} from "@shared/enums";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// ─── Inspections ──────────────────────────────────────────────────────────────

// Full row shape (source of truth for the client `Inspection` type).
export const selectInspectionSchema = createSelectSchema(inspections).openapi(
  "Inspection",
);

// POST body. Server-owned fields are omitted so they can never be set from the
// request; `id` stays optional so an offline client can supply its own UUID for
// idempotent upserts.
export const insertInspectionSchema = createInsertSchema(inspections, {
  inspectionDate: (schema) =>
    schema.regex(ISO_DATE, "inspectionDate must be YYYY-MM-DD"),
  machineLineId: (schema) => schema.min(1, "machineLineId is required").max(120),
  remarks: (schema) => schema.max(1000),
})
  .omit({
    status: true,
    resolutionNote: true,
    resolvedAt: true,
    resolvedBy: true,
    source: true,
    createdBy: true,
    createdAt: true,
    updatedAt: true,
  })
  .openapi("CreateInspection");

// PATCH /{id}/resolve body — a non-empty resolution note is mandatory.
export const resolveInspectionSchema = z
  .object({
    resolutionNote: z.string().min(1, "A resolution note is required").max(1000),
  })
  .openapi("ResolveInspection");

// GET / query params. z.coerce for numerics (query strings are always strings).
export const listInspectionsQuerySchema = z.object({
  severity: z.enum(SEVERITIES).optional(),
  status: z.enum(STATUSES).optional(),
  defectType: z.enum(DEFECT_TYPES).optional(),
  from: z.string().regex(ISO_DATE, "from must be YYYY-MM-DD").optional(),
  to: z.string().regex(ISO_DATE, "to must be YYYY-MM-DD").optional(),
  sort: z.enum(SORT_OPTIONS).default(DEFAULT_SORT),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const listInspectionsResponseSchema = z
  .object({
    data: z.array(selectInspectionSchema),
    meta: z.object({ total: z.number().int() }),
  })
  .openapi("InspectionList");

// ─── Summary ─────────────────────────────────────────────────────────────────

const severityCounts = z.object({
  open: z.number().int(),
  resolved: z.number().int(),
});

export const summarySchema = z
  .object({
    bySeverity: z.object({
      critical: severityCounts,
      major: severityCounts,
      minor: severityCounts,
    }),
    totals: z.object({
      open: z.number().int(),
      resolved: z.number().int(),
      total: z.number().int(),
    }),
  })
  .openapi("Summary");

// ─── Auth ────────────────────────────────────────────────────────────────────

// Never serialize the password hash.
export const selectUserSchema = createSelectSchema(users).omit({
  passwordHash: true,
});

export const publicUserSchema = z
  .object({
    id: z.string(),
    username: z.string(),
  })
  .openapi("User");

export const loginSchema = z
  .object({
    username: z.string().min(1).max(64),
    password: z.string().min(1).max(200),
  })
  .openapi("LoginRequest");

export const loginResponseSchema = z
  .object({
    accessToken: z.string(),
    user: publicUserSchema,
  })
  .openapi("LoginResponse");

export const refreshResponseSchema = z
  .object({ accessToken: z.string() })
  .openapi("RefreshResponse");

export const meResponseSchema = z
  .object({ user: publicUserSchema })
  .openapi("MeResponse");

// ─── SAP webhook (mock) ──────────────────────────────────────────────────────

export const sapWebhookSchema = z
  .object({
    plant_code: z.string().min(1),
    machine_id: z.string().min(1),
    defect_code: z.string().min(1),
    severity: z.enum(["CRITICAL", "MAJOR", "MINOR"]),
    observed_at: z.string().regex(ISO_DATE, "observed_at must be YYYY-MM-DD"),
    notes: z.string().max(1000).nullish(),
  })
  .openapi("SapWebhookPayload");

// ─── Inferred types (shared with the client) ─────────────────────────────────

export type Inspection = z.infer<typeof selectInspectionSchema>;
export type CreateInspection = z.infer<typeof insertInspectionSchema>;
export type ResolveInspection = z.infer<typeof resolveInspectionSchema>;
export type ListInspectionsQuery = z.infer<typeof listInspectionsQuerySchema>;
export type ListInspectionsResponse = z.infer<
  typeof listInspectionsResponseSchema
>;
export type Summary = z.infer<typeof summarySchema>;
export type PublicUser = z.infer<typeof publicUserSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
