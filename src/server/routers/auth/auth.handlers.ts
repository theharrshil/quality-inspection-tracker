import { eq } from "drizzle-orm";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { Context } from "hono";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { users } from "@/db/schema";
import { env } from "@/lib/env";
import { hashPasswordSync, verifyPassword } from "@/lib/scrypt";
import {
  issueRefreshToken,
  revokeRefreshToken,
  rotateRefreshToken,
  signAccessToken,
} from "@/lib/tokens";
import type { AppBindings, AppRouteHandler } from "@/lib/types";
import type {
  LoginRoute,
  LogoutRoute,
  MeRoute,
  RefreshRoute,
} from "./auth.routes";

const REFRESH_COOKIE = "refresh_token";

// A precomputed hash of a throwaway password. When the username doesn't exist we
// still run a verify against this so login timing doesn't reveal whether the
// username was valid.
const DUMMY_HASH = hashPasswordSync("this-user-does-not-exist");

function setRefreshCookie(c: Context<AppBindings>, token: string): void {
  setCookie(c, REFRESH_COOKIE, token, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/api/auth", // only sent to the auth endpoints
    maxAge: env.REFRESH_TOKEN_TTL,
    secure: env.isProd, // omit on plain-http localhost so dev login works
  });
}

function clearRefreshCookie(c: Context<AppBindings>): void {
  deleteCookie(c, REFRESH_COOKIE, { path: "/api/auth" });
}

export const login: AppRouteHandler<LoginRoute> = async (c) => {
  const { username, password } = c.req.valid("json");
  const db = c.var.db;

  const user = db.select().from(users).where(eq(users.username, username)).get();
  const valid = await verifyPassword(
    password,
    user?.passwordHash ?? DUMMY_HASH,
  );

  // Generic failure — never reveal whether the username or the password was wrong.
  if (!user || !valid) {
    return c.json({ message: "Invalid credentials" }, HttpStatusCodes.UNAUTHORIZED);
  }

  const accessToken = await signAccessToken(user.id);
  const refreshToken = issueRefreshToken(db, user.id);
  setRefreshCookie(c, refreshToken);

  return c.json(
    { accessToken, user: { id: user.id, username: user.username } },
    HttpStatusCodes.OK,
  );
};

export const refresh: AppRouteHandler<RefreshRoute> = async (c) => {
  const presented = getCookie(c, REFRESH_COOKIE);
  if (!presented) {
    return c.json({ message: "Unauthorized" }, HttpStatusCodes.UNAUTHORIZED);
  }

  const result = rotateRefreshToken(c.var.db, presented);
  if (!result.ok) {
    clearRefreshCookie(c);
    return c.json({ message: "Unauthorized" }, HttpStatusCodes.UNAUTHORIZED);
  }

  setRefreshCookie(c, result.token);
  const accessToken = await signAccessToken(result.userId);
  return c.json({ accessToken }, HttpStatusCodes.OK);
};

export const logout: AppRouteHandler<LogoutRoute> = (c) => {
  const presented = getCookie(c, REFRESH_COOKIE);
  if (presented) revokeRefreshToken(c.var.db, presented);
  clearRefreshCookie(c);
  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

export const me: AppRouteHandler<MeRoute> = (c) => {
  const user = c.var.user;
  return c.json({ user }, HttpStatusCodes.OK);
};
