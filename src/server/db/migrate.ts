import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db } from "./client";

// Applies any pending SQL migrations from ./drizzle. Called on server startup and
// runnable standalone via `npm run db:migrate`.
export function runMigrations(): void {
  migrate(db, { migrationsFolder: "./drizzle" });
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  runMigrations();
  console.log("✔ Migrations applied");
  process.exit(0);
}
