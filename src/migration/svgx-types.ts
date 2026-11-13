import {
  createRuntimeContext,
  type RuntimeContext,
  type Seam,
  type Cover,
} from "../vector/types.ts";
import type { SceneProp } from "./svgx-props.ts";

/** Historical SVGX data is decoded only for mechanical migration. */
export interface SvgxDocument extends RuntimeContext {
  version: "2";
  props?: SceneProp[];
  seams: Seam[];
  covers: Cover[];
  expectFail?: boolean;
}
/** Creates an empty historical record for the read-only decoder. */
export function createSvgxDocument(id: string): SvgxDocument {
  return { ...createRuntimeContext(id), version: "2", seams: [], covers: [] };
}
