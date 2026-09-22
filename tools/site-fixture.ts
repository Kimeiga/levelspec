import { writeFileSync } from "node:fs";
import { buildCourtyard } from "../website/architecture.ts";
// This snapshot remains a standalone editable source example.
writeFileSync(
  new URL("../website/demo.level.svgx", import.meta.url),
  buildCourtyard({ height: 3, look: "clay" }),
);
console.log("Updated default SVGX from the live authoring module.");
