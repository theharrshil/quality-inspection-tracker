import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

// The client is a self-contained Vite app rooted at src/client. In dev it runs on
// :5173 and proxies /api to the Hono server on :3000. In prod it is built to
// dist/client and served by Hono as static assets (single-process deployment).
export default defineConfig({
  root: "src/client",
  envDir: "../..",
  plugins: [react(), tailwindcss(), tsconfigPaths({ root: "../.." })],
  build: {
    outDir: "../../dist/client",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});
