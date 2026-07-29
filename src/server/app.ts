import { createApp } from "./lib/create-app";
import configureOpenAPI from "./lib/configure-open-api";
import health from "./routers/health";
import auth from "./routers/auth/auth.index";
import inspections from "./routers/inspections/inspections.index";
import summary from "./routers/summary/summary.index";

const app = createApp();

configureOpenAPI(app);

// Feature routers mount under /api at their base paths. Chaining preserves the
// per-route types so AppType can be used for a typed RPC client if desired.
const routes = app
  .route("/api", health)
  .route("/api/auth", auth)
  .route("/api/inspections", inspections)
  .route("/api/summary", summary);

export type AppType = typeof routes;
export default app;
