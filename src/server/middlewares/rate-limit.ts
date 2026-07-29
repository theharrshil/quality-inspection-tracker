import { getConnInfo } from "@hono/node-server/conninfo";
import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import * as HttpStatusCodes from "stoker/http-status-codes";
import type { AppBindings } from "@/lib/types";

// In-memory fixed-window limiter. Per-instance only — a real multi-instance deploy
// would key this off a shared store (Redis). Keyed by client IP + username so a
// single attacker can't lock out every account from one IP, and one account can't
// be brute-forced across the window.
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// getConnInfo only works when the request came through the node server; fall back
// to the forwarded header (or "unknown") so the limiter is safe under app.request.
function clientIp(c: Context<AppBindings>): string {
  const forwarded = c.req.header("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  try {
    return getConnInfo(c).remote.address ?? "unknown";
  } catch {
    return "unknown";
  }
}

export const loginRateLimit = createMiddleware<AppBindings>(async (c, next) => {
  // Read the username defensively; Hono caches the parsed body, so the route's
  // zod validator still sees it afterwards.
  let username = "";
  try {
    const body = (await c.req.json()) as { username?: unknown };
    if (typeof body.username === "string") username = body.username;
  } catch {
    // Non-JSON body — fall through and key on IP alone.
  }

  const key = `${clientIp(c)}:${username}`;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }

  bucket.count += 1;
  if (bucket.count > MAX_ATTEMPTS) {
    c.header("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
    return c.json(
      { message: "Too many login attempts. Please try again later." },
      HttpStatusCodes.TOO_MANY_REQUESTS,
    );
  }

  return next();
});

// Exposed for tests so the limiter can be reset between cases.
export function __resetRateLimit(): void {
  buckets.clear();
}
