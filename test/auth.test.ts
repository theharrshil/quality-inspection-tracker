import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { __resetRateLimit } from "@/middlewares/rate-limit";
import {
  extractRefreshToken,
  readJson,
  refreshCookie,
  request,
  seedDb,
  setupDb,
} from "./helpers";

const CREDS = { username: "supervisor", password: "inspect123" };

interface LoginBody {
  accessToken: string;
  user: { id: string; username: string; passwordHash?: unknown };
}
interface MessageBody {
  message: string;
}
interface ZodErrorBody {
  success: boolean;
  error: { name: string };
}
interface MeBody {
  user: { id: string; username: string };
}

beforeAll(async () => {
  setupDb();
  await seedDb();
});

beforeEach(() => {
  __resetRateLimit();
});

async function login() {
  const res = await request("POST", "/api/auth/login", { json: CREDS });
  const body = await readJson<LoginBody>(res);
  return { res, body, refresh: extractRefreshToken(res) };
}

describe("auth", () => {
  it("logs in with valid credentials and sets a refresh cookie", async () => {
    const { res, body, refresh } = await login();
    expect(res.status).toBe(200);
    expect(typeof body.accessToken).toBe("string");
    expect(body.user).toMatchObject({ username: "supervisor" });
    expect(body.user.passwordHash).toBeUndefined();
    expect(refresh).toBeTruthy();
  });

  it("rejects a wrong password with a generic 401", async () => {
    const res = await request("POST", "/api/auth/login", {
      json: { username: "supervisor", password: "wrong" },
    });
    expect(res.status).toBe(401);
    expect((await readJson<MessageBody>(res)).message).toBe("Invalid credentials");
  });

  it("rejects an unknown username with the same generic 401", async () => {
    const res = await request("POST", "/api/auth/login", {
      json: { username: "nobody", password: "whatever" },
    });
    expect(res.status).toBe(401);
    expect((await readJson<MessageBody>(res)).message).toBe("Invalid credentials");
  });

  it("returns 422 on an invalid login body", async () => {
    const res = await request("POST", "/api/auth/login", {
      json: { username: "" },
    });
    expect(res.status).toBe(422);
    const body = await readJson<ZodErrorBody>(res);
    expect(body.success).toBe(false);
    expect(body.error.name).toBe("ZodError");
  });

  it("GET /me returns the user with a valid access token", async () => {
    const { body } = await login();
    const res = await request("GET", "/api/auth/me", { token: body.accessToken });
    expect(res.status).toBe(200);
    expect((await readJson<MeBody>(res)).user).toMatchObject({
      username: "supervisor",
    });
  });

  it("GET /me is 401 without a token", async () => {
    const res = await request("GET", "/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("refresh rotates the token and returns a new access token", async () => {
    const { refresh } = await login();
    expect(refresh).toBeTruthy();

    const res = await request("POST", "/api/auth/refresh", {
      cookie: refreshCookie(refresh!),
    });
    expect(res.status).toBe(200);
    expect(typeof (await readJson<{ accessToken: string }>(res)).accessToken).toBe(
      "string",
    );

    const rotated = extractRefreshToken(res);
    expect(rotated).toBeTruthy();
    expect(rotated).not.toBe(refresh); // rotation on every refresh
  });

  it("detects refresh-token reuse and revokes the whole family", async () => {
    const { refresh: first } = await login();

    // First rotation: first -> second.
    const rot = await request("POST", "/api/auth/refresh", {
      cookie: refreshCookie(first!),
    });
    const second = extractRefreshToken(rot);
    expect(rot.status).toBe(200);
    expect(second).toBeTruthy();

    // Replay the already-rotated `first` token -> reuse detected -> 401.
    const replay = await request("POST", "/api/auth/refresh", {
      cookie: refreshCookie(first!),
    });
    expect(replay.status).toBe(401);

    // Family revoked, so even the previously-valid `second` token is now dead.
    const afterReuse = await request("POST", "/api/auth/refresh", {
      cookie: refreshCookie(second!),
    });
    expect(afterReuse.status).toBe(401);
  });

  it("logout revokes the refresh token", async () => {
    const { refresh } = await login();
    const out = await request("POST", "/api/auth/logout", {
      cookie: refreshCookie(refresh!),
    });
    expect(out.status).toBe(204);

    const res = await request("POST", "/api/auth/refresh", {
      cookie: refreshCookie(refresh!),
    });
    expect(res.status).toBe(401);
  });

  it("rate-limits repeated login attempts with 429", async () => {
    // 5 attempts allowed per window; the 6th is limited.
    let last = 0;
    for (let i = 0; i < 6; i++) {
      const res = await request("POST", "/api/auth/login", {
        json: { username: "supervisor", password: "wrong" },
      });
      last = res.status;
    }
    expect(last).toBe(429);
  });
});
