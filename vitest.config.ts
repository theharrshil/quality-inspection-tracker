import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Tests run against an in-memory SQLite database with deterministic env values.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    env: {
      DATABASE_URL: ":memory:",
      NODE_ENV: "test",
      JWT_SECRET: "test-secret-do-not-use-in-prod",
      ACCESS_TOKEN_TTL: "900",
      REFRESH_TOKEN_TTL: "604800",
      SEED_USERNAME: "supervisor",
      SEED_PASSWORD: "inspect123",
      SAP_WEBHOOK_SECRET: "test-sap-secret",
    },
    include: ["test/**/*.test.ts"],
    fileParallelism: false,
  },
});
