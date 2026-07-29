import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

// The client is a self-contained Vite app rooted at src/client. In dev, Vite runs
// in middleware mode *inside* the Hono server (see src/server/index.ts), so the app
// serves on one port. In prod it is built to dist/client and served by Hono as
// static assets. This config drives both the middleware-mode dev server and the
// production build.
export default defineConfig({
  root: "src/client",
  envDir: "../..",
  plugins: [react(), tailwindcss(), tsconfigPaths({ root: "../.." })],
  build: {
    outDir: "../../dist/client",
    emptyOutDir: true,
  },
});
