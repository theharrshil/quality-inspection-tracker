import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import app from "./app";
import { runMigrations } from "./db/migrate";
import { seedIfEmpty } from "./db/seed";
import { env } from "./lib/env";

// Startup: apply migrations, then seed if the database is empty, so a fresh clone
// comes up with populated data and a working login on the very first run.
runMigrations();
await seedIfEmpty();

// In production, one process serves the built SPA and the API on a single port.
// In dev, Vite serves the client and proxies /api here.
if (env.isProd) {
  const distClient = "./dist/client";
  app.use("/*", serveStatic({ root: distClient }));

  const indexHtml = readFileSync(
    resolve(process.cwd(), distClient, "index.html"),
    "utf8",
  );
  // SPA fallback: any unmatched non-API GET returns index.html for client routing.
  app.get("*", (c) => {
    const p = c.req.path;
    if (p.startsWith("/api") || p === "/doc" || p === "/reference") {
      return c.notFound();
    }
    return c.html(indexHtml);
  });
}

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`🚀 Quality Inspection Tracker running on http://localhost:${info.port}`);
  console.log(`   • API base   http://localhost:${info.port}/api`);
  console.log(`   • API docs   http://localhost:${info.port}/reference`);
});
