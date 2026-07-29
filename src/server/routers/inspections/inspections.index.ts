import { createRouter } from "@/lib/create-app";
import { requireAuth } from "@/middlewares/require-auth";
import * as handlers from "./inspections.handlers";
import * as routes from "./inspections.routes";

// Every inspections route requires authentication.
const router = createRouter();
router.use("/*", requireAuth);

router
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.resolve, handlers.resolve);

export default router;
