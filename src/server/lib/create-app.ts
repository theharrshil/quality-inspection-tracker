import { OpenAPIHono } from "@hono/zod-openapi";
import { defaultHook } from "stoker/openapi";
import { notFound, onError } from "stoker/middlewares";
import { db } from "@/db/client";
import type { AppBindings } from "./types";

// A router (sub-app) with our bindings and the shared Zod-error defaultHook wired
// in, so a request/response that violates a route's schema yields the standard
// 422 shape rather than throwing.
export function createRouter() {
  return new OpenAPIHono<AppBindings>({
    strict: false,
    defaultHook,
  });
}

// The root app: injects the db handle, then registers the global 404 / 500
// fallthroughs from stoker.
export function createApp() {
  const app = createRouter();
  app.use("*", (c, next) => {
    c.set("db", db);
    return next();
  });
  app.notFound(notFound);
  app.onError(onError);
  return app;
}
