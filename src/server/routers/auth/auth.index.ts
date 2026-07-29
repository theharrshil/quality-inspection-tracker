import { createRouter } from "@/lib/create-app";
import { loginRateLimit } from "@/middlewares/rate-limit";
import { requireAuth } from "@/middlewares/require-auth";
import * as handlers from "./auth.handlers";
import * as routes from "./auth.routes";

// Middleware paths are Hono-style (/login, /me), while route defs are OpenAPI-style.
const router = createRouter();

router.use("/login", loginRateLimit);
router.use("/me", requireAuth);

router
  .openapi(routes.login, handlers.login)
  .openapi(routes.refresh, handlers.refresh)
  .openapi(routes.logout, handlers.logout)
  .openapi(routes.me, handlers.me);

export default router;
