import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { sign, verify } from "hono/jwt";
import type { DB } from "@/db/client";
import { refreshTokens } from "@/db/schema";
import { env } from "@/lib/env";

// ─── Access token (short-lived JWT) ──────────────────────────────────────────

const JWT_ALG = "HS256";

export async function signAccessToken(userId: string): Promise<string> {
  const nowSec = Math.floor(Date.now() / 1000);
  return sign(
    { sub: userId, iat: nowSec, exp: nowSec + env.ACCESS_TOKEN_TTL },
    env.JWT_SECRET,
    JWT_ALG,
  );
}

// Returns the subject (user id) if the token is valid and unexpired, else null.
export async function verifyAccessToken(
  token: string,
): Promise<{ sub: string } | null> {
  try {
    const payload = await verify(token, env.JWT_SECRET, JWT_ALG);
    return typeof payload.sub === "string" ? { sub: payload.sub } : null;
  } catch {
    return null;
  }
}

// ─── Refresh token (opaque, rotating) ────────────────────────────────────────
// The raw token is a random 256-bit string returned to the client in an httpOnly
// cookie. Only its SHA-256 hash is stored, so a database leak can't be replayed.

function generateRawToken(): string {
  return randomBytes(32).toString("base64url");
}

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function refreshExpiry(): number {
  return Date.now() + env.REFRESH_TOKEN_TTL * 1000;
}

export function issueRefreshToken(db: DB, userId: string): string {
  const raw = generateRawToken();
  db.insert(refreshTokens)
    .values({ userId, tokenHash: hashToken(raw), expiresAt: refreshExpiry() })
    .run();
  return raw;
}

// Revokes every still-active refresh token for a user — used on logout-everywhere
// and, crucially, on reuse detection.
function revokeFamily(db: DB, userId: string, at: number): void {
  db.update(refreshTokens)
    .set({ revokedAt: at })
    .where(
      and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)),
    )
    .run();
}

export type RotateResult =
  | { ok: true; userId: string; token: string }
  | { ok: false; reason: "invalid" | "reuse" };

// Rotation on every refresh: the presented token is revoked and a fresh one minted.
// If an already-revoked token is presented again, that's a replay — we revoke the
// whole family and force a re-login (reuse detection).
export function rotateRefreshToken(db: DB, raw: string): RotateResult {
  const row = db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, hashToken(raw)))
    .get();

  if (!row) return { ok: false, reason: "invalid" };

  const now = Date.now();

  if (row.revokedAt !== null) {
    revokeFamily(db, row.userId, now);
    return { ok: false, reason: "reuse" };
  }

  if (row.expiresAt < now) {
    db.update(refreshTokens)
      .set({ revokedAt: now })
      .where(eq(refreshTokens.id, row.id))
      .run();
    return { ok: false, reason: "invalid" };
  }

  const newRaw = generateRawToken();
  const newRow = db
    .insert(refreshTokens)
    .values({
      userId: row.userId,
      tokenHash: hashToken(newRaw),
      expiresAt: refreshExpiry(),
    })
    .returning()
    .get();

  db.update(refreshTokens)
    .set({ revokedAt: now, replacedBy: newRow?.id })
    .where(eq(refreshTokens.id, row.id))
    .run();

  return { ok: true, userId: row.userId, token: newRaw };
}

// Revokes a single active token (logout). Idempotent.
export function revokeRefreshToken(db: DB, raw: string): void {
  db.update(refreshTokens)
    .set({ revokedAt: Date.now() })
    .where(
      and(
        eq(refreshTokens.tokenHash, hashToken(raw)),
        isNull(refreshTokens.revokedAt),
      ),
    )
    .run();
}
