import { dressingDemo } from "../review/demo.ts";
import { mountReviewer } from "../review/app.ts";
import dust2 from "../examples/dust2.aml?raw";
mountReviewer({
  demo: dressingDemo,
  source: dust2,
  openFiles: true,
  worker: () =>
    new Worker(new URL("../review/worker.ts", import.meta.url), { type: "module" }),
});
