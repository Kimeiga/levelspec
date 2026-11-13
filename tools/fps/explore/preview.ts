import { mountReviewer } from "../../../review/app.ts";

const reviewer = mountReviewer({ source: "", deferLoad: true,
  worker: () => new Worker(new URL("../../../review/worker.ts", import.meta.url), { type: "module" }) });
let revision = -1;
window.addEventListener("message", event => {
  if (event.source !== parent || event.origin !== location.origin || event.data?.kind !== "exploration-preview") return;
  if (!Number.isInteger(event.data.revision) || event.data.revision <= revision || typeof event.data.aml !== "string") return;
  revision = event.data.revision;
  reviewer.updateSource(event.data.aml);
});
parent.postMessage({ kind: "exploration-preview-ready" }, location.origin);
window.addEventListener("pagehide", () => reviewer.dispose(), { once: true });
