import { createRoute } from "@hono/zod-openapi";
import { jsonContent } from "stoker/openapi/helpers";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { summarySchema } from "@validators";
import { unauthorizedSchema } from "@/lib/constants";

export const get = createRoute({
  method: "get",
  path: "/",
  tags: ["Summary"],
  security: [{ Bearer: [] }],
  summary: "Defect summary",
  description: "Severity × status counts plus totals, computed via SQL aggregation.",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(summarySchema, "The summary matrix"),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(unauthorizedSchema, "Unauthorized"),
  },
});

export type GetSummaryRoute = typeof get;
