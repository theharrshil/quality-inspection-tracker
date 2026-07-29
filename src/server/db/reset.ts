import { rmSync } from "node:fs";
import { resolve } from "node:path";
import { env } from "@/lib/env";

// Drops the SQLite file, re-runs migrations, and reseeds. Dynamic imports ensure the
// db client opens the connection only *after* the old file has been removed.
if (env.DATABASE_URL !== ":memory:") {
  const path = resolve(process.cwd(), env.DATABASE_URL);
  for (const suffix of ["", "-wal", "-shm"]) {
    rmSync(path + suffix, { force: true });
  }
  console.log("✔ Removed existing database");
}

const { runMigrations } = await import("./migrate");
runMigrations();
console.log("✔ Migrations applied");

const { seed } = await import("./seed");
const result = await seed();
console.log(`✔ Seeded ${result.inspections} inspections`);
process.exit(0);
