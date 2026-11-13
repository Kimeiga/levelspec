import { resolve } from "node:path";
import { defineConfig } from "vite";

const here = import.meta.dirname;
const repository = resolve(here, "../../..");

/** Ninefold first-person preview. Assets come from the art pass under generated/. */
export default defineConfig({
  root: here,
  publicDir: resolve(repository, "generated/ninefold-reboot-production/web"),
  server: { host: "127.0.0.1", port: 5183, fs: { allow: [repository] } },
  build: { outDir: resolve(repository, "generated/ninefold-reboot-production/site"), emptyOutDir: true, target: "es2022" },
});
