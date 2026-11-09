import { localHeightmaps } from "./heightmaps.ts";
/** Read-only loopback preview of one XML source and its declared local companions. */
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { createServer } from "vite";
import { parseAml } from "../architecture/format.ts";
import { architectureCompanions, heightmapCompanions } from "../architecture/assets.ts";
import { parseViewOptions, type ReviewViewOptions } from "../../review/view.ts";
import { parseNavigationCell } from "../../review/navigation-cell.ts";

/** Starts a file-watching reviewer; the caller owns closing the returned server. */
export async function startPreview(file: string, options: {port?:number;signal?:AbortSignal;view?:ReviewViewOptions;suggestion?:string;diagnostic?:string;navigationCell?:number} = {}) {
  const viewParameters = new URLSearchParams();
  if (options.navigationCell !== undefined) {
    const cell = parseNavigationCell(String(options.navigationCell));
    viewParameters.set("nav-cell", String(cell));
  }
  if (options.view?.position) viewParameters.set("camera", options.view.position.join(" "));
  if (options.view?.target) viewParameters.set("target", options.view.target.join(" "));
  if (options.view?.projection) viewParameters.set("projection", options.view.projection);
  if (options.view?.fov !== undefined) viewParameters.set("fov", String(options.view.fov));
  if (options.view?.viewHeight !== undefined) viewParameters.set("view-height", String(options.view.viewHeight));
  if (options.view?.roll !== undefined) viewParameters.set("roll", String(options.view.roll));
  if (options.view?.appearance !== undefined) viewParameters.set("appearance", options.view.appearance);
  if (options.view?.frameAspect !== undefined) viewParameters.set("frame-aspect", String(options.view.frameAspect));
  if (options.diagnostic && options.suggestion) throw new Error("diagnostic and suggestion are mutually exclusive.");
  if (options.diagnostic) viewParameters.set("diagnostic", options.diagnostic);
  if (options.suggestion) viewParameters.set("suggestion", options.suggestion);
  parseViewOptions(viewParameters);
  const source = resolve(file), root = fileURLToPath(new URL("../../", import.meta.url));
  await readFile(source, "utf8");
  const token = randomUUID(), endpoint = `/__levelspec/${token}`;
  const clients = new Set<import("node:http").ServerResponse>();
  const tracked = new Set([source]);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let revision = 0;
  const server = await createServer({
    configFile:false, root, publicDir:false, logLevel:"silent",
    server:{host:"127.0.0.1",port:options.port ?? 5173,strictPort:options.port !== undefined,fs:{allow:[root]}},
    optimizeDeps:{exclude:["manifold-3d","recast-navigation","xatlas-wasm"]},
    plugins:[{
      name:"levelspec-readonly-preview",
      configureServer(vite) {
        vite.middlewares.use((req,res,next)=>{
          void (async () => {
          if(new URL(req.url ?? "/", "http://localhost").pathname === "/") {
            const html=await vite.transformIndexHtml("/",`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LevelSpec preview</title></head><body><script type="module" src="/src/cli/preview-client.ts?session=${token}"></script></body></html>`);
            res.setHeader("Content-Type","text/html");res.end(html);return;
          }
          if(req.url !== `${endpoint}/source` && req.url !== `${endpoint}/events`){next();return;}
          if(req.method !== "GET"){res.statusCode=405;res.end();return;}
          res.setHeader("Cache-Control","no-store");
          if(req.url.endsWith("/events")) {
            res.setHeader("Content-Type","text/event-stream");res.flushHeaders();
            clients.add(res);req.on("close",()=>clients.delete(res));return;
          }
          res.setHeader("Content-Type","application/json");
          try {
            const text=await readFile(source,"utf8"), files:Record<string,number[]>={};
            let references:string[]=[], heightmaps=new Set<string>();
            const rasterLoader=localHeightmaps(source);
            try {
              const document=parseAml(text);
              references=architectureCompanions(document);heightmaps=heightmapCompanions(document);
            } catch { /* Send malformed text to the normal source-linked worker diagnostics. */ }
            for(const reference of new Set(references)) {
              if(/^[a-z]+:/i.test(reference))throw new Error(`Preview requires a local asset: ${reference}`);
              const path=resolve(dirname(source),reference);tracked.add(path);vite.watcher.add(dirname(path));
              files[reference.replaceAll("\\","/").replace(/^\.\//,"")]=Array.from(heightmaps.has(reference) ? await rasterLoader.load({src:reference}) : await readFile(path));
            }
            res.end(JSON.stringify({text,files,revision}));
          } catch(error) {res.end(JSON.stringify({error:(error as Error).message,revision}));}
          })().catch(next);
        });
      },
      handleHotUpdate(context) {
        if(tracked.has(context.file))return [];
      },
    }],
  });
  server.watcher.add(dirname(source));
  const changed=(path:string)=>{
    if(!tracked.has(resolve(path)))return;
    clearTimeout(timer);
    timer=setTimeout(()=>{revision++;for(const client of clients)client.write(`data: ${revision}\n\n`);},80);
  };
  server.watcher.on("all",(_event,path)=>changed(path));
  let closing: Promise<void> | undefined;
  const close=()=> closing ??= (async()=>{
    clearTimeout(timer);for(const client of clients)client.end();clients.clear();
    options.signal?.removeEventListener("abort",abort);await server.close();
  })();
  const abort=()=>{void close();};
  try {options.signal?.throwIfAborted();await server.listen();options.signal?.throwIfAborted();options.signal?.addEventListener("abort",abort,{once:true});}
  catch(error){await close();throw error;}
  const url = new URL(server.resolvedUrls!.local[0]);
  url.search = viewParameters.toString();
  return {url:url.href,close};
}
