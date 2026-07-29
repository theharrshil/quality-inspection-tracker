import { randomBytes } from "node:crypto";

// Load .env if present, but don't require it — the app must boot with safe defaults
// so a reviewer can clone-and-run with zero configuration. process.loadEnvFile()
// throws if the file is missing, hence the try/catch. Skipped under test so a
// developer's local .env can't leak into the deterministic test environment.
if (process.env.NODE_ENV !== "test") {
  try {
    process.loadEnvFile();
  } catch {
    // No .env file — rely on the real environment plus the defaults below.
  }
}

function num(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && value !== undefined && value !== "" ? n : fallback;
}

function resolveJwtSecret(): string {
  const fromEnv = process.env.JWT_SECRET;
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  // Generate an ephemeral secret so dev works without setup. Tokens won't survive a
  // restart — fine for local use, but a real deploy must set JWT_SECRET.
  const generated = randomBytes(32).toString("hex");
  console.warn(
    "[env] JWT_SECRET is not set — generated an ephemeral dev secret. " +
      "Tokens will be invalidated on restart. Set JWT_SECRET for production.",
  );
  return generated;
}

const NODE_ENV = process.env.NODE_ENV ?? "development";

export const env = {
  NODE_ENV,
  isProd: NODE_ENV === "production",
  PORT: num(process.env.PORT, 3000),
  JWT_SECRET: resolveJwtSecret(),
  SAP_WEBHOOK_SECRET: process.env.SAP_WEBHOOK_SECRET ?? "dev-sap-secret",
  ACCESS_TOKEN_TTL: num(process.env.ACCESS_TOKEN_TTL, 900), // seconds (15 min)
  REFRESH_TOKEN_TTL: num(process.env.REFRESH_TOKEN_TTL, 604800), // seconds (7 days)
  DATABASE_URL: process.env.DATABASE_URL ?? "./data/app.sqlite",
  SEED_USERNAME: process.env.SEED_USERNAME ?? "supervisor",
  SEED_PASSWORD: process.env.SEED_PASSWORD ?? "inspect123",
} as const;

export type Env = typeof env;
