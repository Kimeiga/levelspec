import { defineConfig } from "vite";
/** Sample Three.js game that consumes `tools/game-export.ts` output from game/public/maps. */
export default defineConfig({
  root: "game",
  server: { host: "127.0.0.1" },
  build: { outDir: "../dist-game", emptyOutDir: true, target: "es2022" },
});
