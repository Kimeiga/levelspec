import { defineConfig } from "vite";
import { createHash } from "node:crypto";

// A single static build: no server functions, remote fonts, or runtime CDN.
export default defineConfig({
  root: "website",
  base: process.env.SITE_BASE || "/",
  publicDir: "public",
  server: { host: "127.0.0.1", fs: { allow: [".."] } },
  build: { outDir: "../dist-site", emptyOutDir: true },
  worker: { format: "es" },
  optimizeDeps: {
    exclude: ["manifold-3d", "recast-navigation", "xatlas-wasm"],
  },
  plugins: [
    {
      name: "offline-demo",
      enforce: "post",
      generateBundle(_options, bundle) {
        const base = process.env.SITE_BASE || "/";
        const files = Object.keys(bundle).filter(
          (name) => !name.endsWith(".map"),
        );
        const hash = createHash("sha256");
        for (const name of files.sort()) {
          const item = bundle[name];
          hash
            .update(name)
            .update(item.type === "chunk" ? item.code : item.source);
        }
        const prefix = `levelspec-demo-${createHash("sha256").update(base).digest("hex").slice(0, 8)}-`;
        const cache = `${prefix}${hash.digest("hex").slice(0, 16)}`;
        const urls = [
          ...files.map((name) => base + name),
          base + "favicon.svg",
        ];
        // Static assets are public and content-hashed. Ignore Vary: Origin when
        // replaying precached responses for module requests during offline use.
        const source = `const CACHE=${JSON.stringify(cache)},URLS=${JSON.stringify(urls)},BASE=${JSON.stringify(base)},PREFIX=${JSON.stringify(prefix)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(URLS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)).slice(0,-2).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const u=new URL(event.request.url);if(event.request.method!=='GET'||u.origin!==location.origin||!u.pathname.startsWith(BASE))return;
if(u.pathname===BASE||u.pathname===BASE+'index.html'){event.respondWith(caches.open(CACHE).then(c=>c.match(BASE+'index.html')).then(r=>r||fetch(event.request)));return;}
event.respondWith(caches.match(event.request,{ignoreVary:true}).then(r=>r||fetch(event.request)));});`;
        this.emitFile({ type: "asset", fileName: "sw.js", source });
        this.emitFile({ type: "asset", fileName: ".nojekyll", source: "" });
      },
    },
  ],
});
