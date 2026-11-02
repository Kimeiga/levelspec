import { defineConfig } from "vite";
export default defineConfig({
  root: "viewer",
  publicDir: "../public",
  server: { host: "127.0.0.1", fs: { allow: [".."] } },
  build: { outDir: "../dist", emptyOutDir: true },
  worker: { format: "es" },
  optimizeDeps: {
    exclude: ["manifold-3d", "recast-navigation", "xatlas-wasm"],
  },
});
