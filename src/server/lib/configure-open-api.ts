import { apiReference } from "@scalar/hono-api-reference";
import type { AppOpenAPI } from "./types";

// Mounts the generated OpenAPI document at /doc and the Scalar UI at /reference.
// Registers a Bearer security scheme so /reference shows the auth lock and lets a
// reviewer paste an access token to try protected endpoints.
export default function configureOpenAPI(app: AppOpenAPI) {
  app.openAPIRegistry.registerComponent("securitySchemes", "Bearer", {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
  });

  app.doc("/doc", {
    openapi: "3.0.0",
    info: {
      version: "1.0.0",
      title: "Quality Inspection Tracker API",
      description:
        "Log, filter, resolve, and summarize fabric-plant quality defects. " +
        "Protected endpoints require a Bearer access token from POST /api/auth/login.",
    },
  });

  app.get(
    "/reference",
    apiReference({
      url: "/doc",
      pageTitle: "Quality Inspection Tracker API",
      theme: "kepler",
    }),
  );
}
