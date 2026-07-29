import { createRouter } from "@/lib/create-app";
import { requireAuth } from "@/middlewares/require-auth";
import * as handlers from "./summary.handlers";
import * as routes from "./summary.routes";

const router = createRouter();
router.use("/*", requireAuth);
router.openapi(routes.get, handlers.get);

export default router;
