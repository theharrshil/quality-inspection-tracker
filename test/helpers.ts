import { runMigrations } from "@/db/migrate";
import { seed } from "@/db/seed";
import app from "@/app";

// Boots a fresh in-memory database (migrate + seed) for a test file.
export function setupDb(): void {
  runMigrations();
}

export async function seedDb(): Promise<void> {
  await seed();
}

export { app };

interface RequestOptions {
  token?: string;
  cookie?: string;
  json?: unknown;
}

// Thin wrapper around app.request that sets JSON/auth/cookie headers.
export async function request(
  method: string,
  path: string,
  opts: RequestOptions = {},
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (opts.json !== undefined) headers["Content-Type"] = "application/json";
  if (opts.token) headers["Authorization"] = `Bearer ${opts.token}`;
  if (opts.cookie) headers["Cookie"] = opts.cookie;
  return app.request(path, {
    method,
    headers,
    body: opts.json !== undefined ? JSON.stringify(opts.json) : undefined,
  });
}

// Typed JSON reader — the server tsconfig has no DOM lib, so Response.json() is
// `unknown`. This keeps test assertions type-safe without sprinkling casts.
export async function readJson<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

// Pulls the refresh_token value out of a response's Set-Cookie header(s).
export function extractRefreshToken(res: Response): string | null {
  const getSetCookie = (
    res.headers as unknown as { getSetCookie?: () => string[] }
  ).getSetCookie;
  const cookies =
    typeof getSetCookie === "function"
      ? getSetCookie.call(res.headers)
      : [res.headers.get("set-cookie") ?? ""];

  for (const cookie of cookies) {
    const match = /(?:^|;\s*)refresh_token=([^;]*)/.exec(cookie);
    if (match && match[1]) return match[1];
  }
  return null;
}

export function refreshCookie(token: string): string {
  return `refresh_token=${token}`;
}
