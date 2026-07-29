import { eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { users } from "@/db/schema";
import { verifyAccessToken } from "@/lib/tokens";
import type { AppBindings } from "@/lib/types";

// Verifies the `Authorization: Bearer <jwt>` access token, loads the user, and
// places it on the context as c.var.user. Responds 401 { message } otherwise.
export const requireAuth = createMiddleware<AppBindings>(async (c, next) => {
  const header = c.req.header("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return c.json({ message: "Unauthorized" }, HttpStatusCodes.UNAUTHORIZED);
  }

  const claims = await verifyAccessToken(token);
  if (!claims) {
    return c.json({ message: "Unauthorized" }, HttpStatusCodes.UNAUTHORIZED);
  }

  const user = c.var.db
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(eq(users.id, claims.sub))
    .get();

  if (!user) {
    return c.json({ message: "Unauthorized" }, HttpStatusCodes.UNAUTHORIZED);
  }

  c.set("user", user);
  await next();
});
