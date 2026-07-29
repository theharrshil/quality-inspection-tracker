import { createRoute } from "@hono/zod-openapi";
import { jsonContentRequired, jsonContent } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";
import * as HttpStatusCodes from "stoker/http-status-codes";
import {
  loginResponseSchema,
  loginSchema,
  meResponseSchema,
  refreshResponseSchema,
} from "@validators";
import { unauthorizedSchema, tooManyRequestsSchema } from "@/lib/constants";

const tags = ["Auth"];

export const login = createRoute({
  method: "post",
  path: "/login",
  tags,
  summary: "Log in",
  description:
    "Rate-limited. On success returns an access token and sets a rotating refresh-token cookie.",
  request: {
    body: jsonContentRequired(loginSchema, "Username and password"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(loginResponseSchema, "Access token + user"),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      unauthorizedSchema,
      "Invalid credentials",
    ),
    [HttpStatusCodes.TOO_MANY_REQUESTS]: jsonContent(
      tooManyRequestsSchema,
      "Too many attempts",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(loginSchema),
      "Validation error",
    ),
  },
});

export const refresh = createRoute({
  method: "post",
  path: "/refresh",
  tags,
  summary: "Rotate the refresh token",
  description:
    "Reads the refresh cookie, rotates it, and returns a new access token. Reusing a rotated token revokes the whole family.",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(refreshResponseSchema, "New access token"),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      unauthorizedSchema,
      "Missing, invalid, expired, or replayed refresh token",
    ),
  },
});

export const logout = createRoute({
  method: "post",
  path: "/logout",
  tags,
  summary: "Log out",
  description: "Revokes the current refresh token and clears the cookie.",
  responses: {
    [HttpStatusCodes.NO_CONTENT]: { description: "Logged out" },
  },
});

export const me = createRoute({
  method: "get",
  path: "/me",
  tags,
  summary: "Current user",
  security: [{ Bearer: [] }],
  responses: {
    [HttpStatusCodes.OK]: jsonContent(meResponseSchema, "The authenticated user"),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      unauthorizedSchema,
      "Missing or invalid access token",
    ),
  },
});

export type LoginRoute = typeof login;
export type RefreshRoute = typeof refresh;
export type LogoutRoute = typeof logout;
export type MeRoute = typeof me;
