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

// Paths owned by the server itself — never handed to the client fallback/proxy.
function isServerPath(path: string): boolean {
  return path.startsWith("/api") || path === "/doc" || path === "/reference";
}

if (env.isProd) {
  // Production: one process serves the built SPA and the API on a single port.
  const distClient = "./dist/client";
  app.use("/*", serveStatic({ root: distClient }));

  const indexHtml = readFileSync(
    resolve(process.cwd(), distClient, "index.html"),
    "utf8",
  );
  // SPA fallback: any unmatched non-API GET returns index.html for client routing.
  app.get("*", (c) => {
    if (isServerPath(c.req.path)) return c.notFound();
    return c.html(indexHtml);
  });
} else {
  // Development: also single-port. This server proxies every non-API request to the
  // Vite dev server, so the whole app (UI + API + docs) is reachable on one port.
  // Vite's HMR websocket connects straight to :5173 (server.hmr.clientPort in
  // vite.config.ts), so it doesn't need proxying here.
  const viteOrigin = process.env.VITE_DEV_ORIGIN ?? "http://localhost:5173";

  app.all("*", async (c) => {
    if (isServerPath(c.req.path)) return c.notFound();
    const url = new URL(c.req.url);
    const target = `${viteOrigin}${url.pathname}${url.search}`;
    try {
      const upstream = await fetch(target, {
        method: c.req.method,
        headers: c.req.raw.headers,
        body:
          c.req.method === "GET" || c.req.method === "HEAD"
            ? undefined
            : await c.req.raw.arrayBuffer(),
        redirect: "manual",
      });
      // fetch already decompressed the body; drop headers that would mislead the
      // browser into decoding it again.
      const headers = new Headers(upstream.headers);
      headers.delete("content-encoding");
      headers.delete("content-length");
      return new Response(upstream.body, { status: upstream.status, headers });
    } catch {
      return c.html(
        "<h1>Starting the dev server…</h1><p>Vite is warming up — refresh in a moment.</p>",
        503,
      );
    }
  });
}

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  const base = `http://localhost:${info.port}`;
  console.log(`🚀 Quality Inspection Tracker running on ${base}`);
  console.log(`   • App        ${base}${env.isProd ? "" : "  (single port — open this)"}`);
  console.log(`   • API docs   ${base}/reference`);
});
