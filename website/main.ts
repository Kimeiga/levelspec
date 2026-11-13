import { dressingDemo } from "../review/demo.ts";
import { mountReviewer } from "../review/app.ts";
import { materialURLs } from "./materials.ts";
import courtyard from "./demo.aml?raw";
mountReviewer({
  demo: dressingDemo,
  source: courtyard,
  assets: { ...materialURLs },
  openFiles: true,
  offline: true,
  worker: () =>
    new Worker(new URL("../review/worker.ts", import.meta.url), {
      type: "module",
    }),
});
