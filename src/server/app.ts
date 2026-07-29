import { createApp } from "./lib/create-app";
import configureOpenAPI from "./lib/configure-open-api";
import health from "./routers/health";
import auth from "./routers/auth/auth.index";

const app = createApp();

configureOpenAPI(app);

// Feature routers mount under /api at their base paths. Chaining preserves the
// per-route types so AppType can be used for a typed RPC client if desired.
const routes = app
  .route("/api", health)
  .route("/api/auth", auth);

export type AppType = typeof routes;
export default app;
