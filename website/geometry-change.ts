import type { CompiledLevel } from "../src/vector/types.ts";
export function changedObjects(
  before: CompiledLevel | undefined,
  after: CompiledLevel,
): Set<string> {
  if (!before || before.document.id !== after.document.id) return new Set();
  const signature = (l: CompiledLevel) => {
    const map = new Map<string, string>();
    for (let t = 0; t < l.mesh.surfaces.length; t++) {
      const id = l.surfaces[l.mesh.surfaces[t]].object;
      let text = map.get(id) || "";
      for (let j = 0; j < 3; j++) {
        const v = l.mesh.indices[t * 3 + j];
        text += l.mesh.positions.slice(v * 3, v * 3 + 3).join(",") + ";";
      }
      map.set(id, text);
    }
    return map;
  };
  const a = signature(before),
    b = signature(after);
  return new Set([...b].filter(([id, v]) => a.get(id) !== v).map(([id]) => id));
}
