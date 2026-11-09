import { mountReviewer } from "../review/app.ts";
import dust2 from "../examples/dust2.aml?raw";
mountReviewer({
  source: dust2,
  local: true,
  worker: () =>
    new Worker(new URL("./worker.ts", import.meta.url), { type: "module" }),
});
