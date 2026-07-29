import { createMiddleware } from "hono/factory";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { createRouter } from "@/lib/create-app";
import { env } from "@/lib/env";
import type { AppBindings } from "@/lib/types";
import * as handlers from "./sap.handlers";
import * as routes from "./sap.routes";

// Guards the webhook with the shared secret header (not JWT auth).
const requireWebhookSecret = createMiddleware<AppBindings>(async (c, next) => {
  if (c.req.header("x-webhook-secret") !== env.SAP_WEBHOOK_SECRET) {
    return c.json(
      { message: "Invalid webhook secret" },
      HttpStatusCodes.UNAUTHORIZED,
    );
  }
  await next();
});

const router = createRouter();
router.use("/sap-webhook", requireWebhookSecret);
router.openapi(routes.webhook, handlers.webhook);

export default router;
