import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { env } from "@/lib/env";
import * as schema from "./schema";

// SERVER ONLY — imports better-sqlite3. The client must never import this file.
const isMemory = env.DATABASE_URL === ":memory:";
const dbPath = isMemory ? ":memory:" : resolve(process.cwd(), env.DATABASE_URL);

if (!isMemory) {
  mkdirSync(dirname(dbPath), { recursive: true });
}

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export type DB = typeof db;

export { schema, sqlite };
