import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  root: "tools/fps/explore", publicDir: false,
  server: { host: "127.0.0.1", port: 63302, fs: { allow: [resolve(".")] } },
  build: { outDir: "../../../generated/explore-dist", emptyOutDir: true,
    rollupOptions: { input: { lab: resolve("tools/fps/explore/index.html"), preview: resolve("tools/fps/explore/preview.html") } } },
  worker: { format: "es" },
  optimizeDeps: { exclude: ["manifold-3d", "recast-navigation", "xatlas-wasm"] },
});
