import type { OpenAPIHono, RouteConfig, RouteHandler } from "@hono/zod-openapi";
import type { DB } from "@/db/client";

// The authenticated principal placed on the context by require-auth.
export interface AuthUser {
  id: string;
  username: string;
}

export interface AppBindings {
  Variables: {
    db: DB;
    // Present only on routes behind require-auth; read it only in protected handlers.
    user: AuthUser;
  };
}

export type AppOpenAPI = OpenAPIHono<AppBindings>;
export type AppRouteHandler<R extends RouteConfig> = RouteHandler<R, AppBindings>;
