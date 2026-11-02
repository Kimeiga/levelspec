import { mountReviewer } from "../review/app.ts";
import showcase from "../examples/showcase.level.svgx?raw";
mountReviewer({
  source: showcase,
  local: true,
  worker: () =>
    new Worker(new URL("./worker.ts", import.meta.url), { type: "module" }),
});
