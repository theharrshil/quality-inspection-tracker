import { createServer as createHttpServer } from "node:http";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getRequestListener, serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import app from "./app";
import { runMigrations } from "./db/migrate";
import { seedIfEmpty } from "./db/seed";
import { env } from "./lib/env";

// Startup: apply migrations, then seed if the database is empty, so a fresh clone
// comes up with populated data and a working login on the very first run.
runMigrations();
await seedIfEmpty();

// Paths owned by the server itself — never handed to the client fallback/Vite.
function isServerPath(path: string): boolean {
  return path.startsWith("/api") || path === "/doc" || path === "/reference";
}

function banner(port: number): void {
  const base = `http://localhost:${port}`;
  console.log(`🚀 Quality Inspection Tracker running on ${base}`);
  console.log(`   • App        ${base}`);
  console.log(`   • API docs   ${base}/reference`);
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

  serve({ fetch: app.fetch, port: env.PORT }, (info) => banner(info.port));
} else {
  // Development: embed the Vite dev server in this process via middleware mode, so
  // the whole app (UI + HMR + API + docs) runs on ONE port with a single command —
  // no separate Vite port. Vite is a devDependency imported dynamically here, so it
  // is never pulled into the production path.
  const { createServer: createViteServer } = await import("vite");

  const honoListener = getRequestListener(app.fetch);
  const httpServer = createHttpServer();

  const vite = await createViteServer({
    configFile: resolve(process.cwd(), "vite.config.ts"),
    // middlewareMode lets us drive Vite from our own HTTP server; attaching HMR to
    // that server means the websocket lives on the same port too.
    server: { middlewareMode: true, hmr: { server: httpServer } },
    appType: "custom",
  });

  const clientIndex = resolve(process.cwd(), "src/client/index.html");

  httpServer.on("request", (req, res) => {
    const path = (req.url ?? "/").split("?")[0] ?? "/";

    // API, doc, and reference are handled by Hono; everything else by Vite.
    if (isServerPath(path)) {
      honoListener(req, res);
      return;
    }

    vite.middlewares(req, res, async () => {
      // Vite didn't serve an asset/module → return the transformed index.html so
      // client-side routing works (with HMR wired in).
      try {
        const template = await vite.transformIndexHtml(
          req.url ?? "/",
          readFileSync(clientIndex, "utf8"),
        );
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html");
        res.end(template);
      } catch (err) {
        vite.ssrFixStacktrace(err as Error);
        res.statusCode = 500;
        res.end(err instanceof Error ? err.stack : String(err));
      }
    });
  });

  httpServer.listen(env.PORT, () => banner(env.PORT));
}
