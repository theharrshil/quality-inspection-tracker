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
    // Fixed port so the Hono dev server can reliably proxy to it (single-port dev).
    port: 5173,
    strictPort: true,
    // The page is served via Hono on :3000, but HMR connects straight back to Vite.
    hmr: { clientPort: 5173 },
    // Also allow opening Vite directly on :5173, which proxies /api to Hono.
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});
