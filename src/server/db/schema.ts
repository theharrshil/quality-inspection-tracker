import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
// Relative import (not the @shared alias) so drizzle-kit, which compiles this file
// without our tsconfig path resolution, can still resolve the enums.
import {
  DEFECT_TYPES,
  SEVERITIES,
  SOURCES,
  STATUSES,
} from "../../shared/enums";

// Uses the global Web Crypto `crypto.randomUUID` (available in Node 19+ and the
// browser) rather than importing `node:crypto`, keeping this file isomorphic-safe:
// the client may import its inferred types without pulling in a node dependency.
const uuid = () => crypto.randomUUID();
const now = () => Date.now();

export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(uuid),
  username: text("username").notNull().unique(),
  // scrypt hash stored as `saltHex:keyHex`. Never serialized (see selectUserSchema).
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at").notNull().$defaultFn(now),
});

export const inspections = sqliteTable("inspections", {
  // Client may supply the id (offline idempotency); otherwise generated server-side.
  id: text("id").primaryKey().$defaultFn(uuid),
  inspectionDate: text("inspection_date").notNull(), // ISO YYYY-MM-DD
  machineLineId: text("machine_line_id").notNull(),
  defectType: text("defect_type", { enum: DEFECT_TYPES }).notNull(),
  severity: text("severity", { enum: SEVERITIES }).notNull(),
  remarks: text("remarks"),
  status: text("status", { enum: STATUSES }).notNull().default("open"),
  resolutionNote: text("resolution_note"),
  resolvedAt: integer("resolved_at"), // epoch ms
  resolvedBy: text("resolved_by").references(() => users.id),
  source: text("source", { enum: SOURCES }).notNull().default("manual"),
  // Stamped from the auth token; null for SAP-sourced rows (no human author).
  createdBy: text("created_by").references(() => users.id),
  createdAt: integer("created_at").notNull().$defaultFn(now),
  updatedAt: integer("updated_at").notNull().$defaultFn(now),
});

export const refreshTokens = sqliteTable("refresh_tokens", {
  id: text("id").primaryKey().$defaultFn(uuid),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  // SHA-256 of the opaque token; the raw token is never stored.
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: integer("expires_at").notNull(), // epoch ms
  revokedAt: integer("revoked_at"), // epoch ms, null while active
  replacedBy: text("replaced_by"), // id of the token that rotated this one
  createdAt: integer("created_at").notNull().$defaultFn(now),
});

export type Inspection = typeof inspections.$inferSelect;
export type NewInspection = typeof inspections.$inferInsert;
export type User = typeof users.$inferSelect;
export type RefreshToken = typeof refreshTokens.$inferSelect;
