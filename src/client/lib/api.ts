// Centralized fetch wrapper. Holds the access token in memory (never localStorage,
// to limit XSS token theft), attaches it as a Bearer header, and on a 401 attempts
// a single silent refresh-and-retry before giving up and signalling logout.

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

type RefreshHandler = () => Promise<string | null>;
let refreshHandler: RefreshHandler | null = null;

// Registered by the auth layer so apiFetch can rotate the token on a 401 without
// importing React state.
export function setRefreshHandler(fn: RefreshHandler): void {
  refreshHandler = fn;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function messageFromBody(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "message" in body) {
    const m = (body as { message: unknown }).message;
    if (typeof m === "string") return m;
  }
  return fallback;
}

// Endpoints where a 401 is a real auth answer, not a "token expired, go refresh"
// signal — retrying these would loop.
function skipRefresh(path: string): boolean {
  return path.startsWith("/auth/login") || path.startsWith("/auth/refresh");
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  isRetry = false,
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const res = await fetch(`/api${path}`, {
    ...init,
    headers,
    credentials: "include", // send the refresh cookie to /api/auth/*
  });

  if (res.status === 401 && !isRetry && !skipRefresh(path) && refreshHandler) {
    const newToken = await refreshHandler();
    if (newToken) {
      accessToken = newToken;
      return apiFetch<T>(path, init, true);
    }
    // Refresh failed → fully logged out.
    window.dispatchEvent(new CustomEvent("auth:expired"));
    throw new ApiError(401, null, "Your session has expired. Please sign in.");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body, messageFromBody(body, res.statusText));
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
