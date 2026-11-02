import { mountReviewer } from "../review/app.ts";
import { materialURLs } from "./materials.ts";
import courtyard from "./demo.level.svgx?raw";
mountReviewer({
  source: courtyard,
  assets: { ...materialURLs },
  local: false,
  worker: () =>
    new Worker(new URL("../viewer/worker.ts", import.meta.url), {
      type: "module",
    }),
});
