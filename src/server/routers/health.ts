import { createRoute, z } from "@hono/zod-openapi";
import { jsonContent } from "stoker/openapi/helpers";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { createRouter } from "@/lib/create-app";

// Liveness probe. Mounted at /api, so the full path is GET /api/health.
const router = createRouter().openapi(
  createRoute({
    method: "get",
    path: "/health",
    tags: ["Meta"],
    summary: "Liveness check",
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        z.object({ status: z.literal("ok") }),
        "Service is healthy",
      ),
    },
  }),
  (c) => c.json({ status: "ok" as const }, HttpStatusCodes.OK),
);

export default router;
