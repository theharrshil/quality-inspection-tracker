import { createRoute } from "@hono/zod-openapi";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { sapWebhookSchema, selectInspectionSchema } from "@validators";
import { unauthorizedSchema } from "@/lib/constants";

// Because this is a *mock we control*, it uses createRoute + a Zod schema, so it is
// validated and shows up in /reference. A real external webhook would skip OpenAPI
// and verify an HMAC signature over the raw body instead (see README).
export const webhook = createRoute({
  method: "post",
  path: "/sap-webhook",
  tags: ["SAP (mock)"],
  security: [{ WebhookSecret: [] }],
  summary: "Ingest a SAP defect event",
  description:
    "Guarded by the x-webhook-secret header. Maps the SAP payload to an inspection with source=sap and no human author (createdBy=null).",
  request: {
    body: jsonContentRequired(sapWebhookSchema, "SAP defect event"),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      selectInspectionSchema,
      "Inspection created from the SAP event",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      unauthorizedSchema,
      "Missing or invalid webhook secret",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(sapWebhookSchema),
      "Invalid payload",
    ),
  },
});

export type WebhookRoute = typeof webhook;
