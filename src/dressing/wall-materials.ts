import { libraryMaterial, type MaterialRole } from "../materials/catalog.ts";
import type { CompiledArchitecture } from "../architecture/types.ts";

const slots: Record<string, string> = {
  paper: "paper", posters: "posters", edge: "edge", rust: "rust", cable: "cable",
  pipe: "metal", metal: "metal", shutter: "metal", ceramic: "ceramic", ceramicWarm: "ceramic", ceramicGray: "ceramic",
};

/** Declared prefix suffixes accepted by both wall material binding and kit validation. */
export const WALL_FINISH_ROLES = [...new Set(Object.values(slots))].map(role => `wall-${role}`).concat("wall-tile-plaster");

/** Textured plaster bedding beneath ceramic, independent of the wall's structural palette. */
export const WALL_TILE_BED = "$kowloon/wall-tile-bed";

/** Matte brown deposits coat the ceramic without changing its plaster bed. */
export const WALL_TILE_GRIME = "$kowloon/wall-tile-grime";

/** Identifies the generated base finish of a plain wall, distinct from shallow props. */
export function wallBaseMaterial(host: string, finish: number): string {
  return `$kowloon/wall-finish/${host}/${finish}`;
}

/** Identifies a host's explicit ceramic color without tinting its substrate or neighboring walls. */
export function wallTileMaterial(host: string): string {
  return `$kowloon/wall-ceramic/${host}`;
}

/** Identifies a host's bedding color without recoloring its tiles or neighboring receivers. */
export function tilePlasterMaterial(host: string): string {
  return `$kowloon/wall-tile-bed/${host}`;
}

/** Registers exportable finishes used by ceramic fragments, paper and utilities. */
export function wallMaterials(level: CompiledArchitecture) {
  const defaults: Record<string, MaterialRole> = {
    paper: "wall-posters", posters: "wall-posters", edge: "concrete", rust: "wall-rust",
    pipe: "wall-metal", cable: "wall-cable", shutter: "wall-metal", metal: "wall-metal",
    ceramic: "ceramic", ceramicWarm: "ceramic", ceramicGray: "ceramic",
  };
  const prefix = level.architecture.dressing!.finishes;
  for (const [name, role] of Object.entries(defaults)) {
    const id = `$kowloon/wall-${name}`;
    if (level.architecture.materials.some(material => material.id === id))
      throw new Error(`Reserved kit material ${id} is already declared.`);
    const declared = prefix === undefined ? undefined : level.architecture.materials.find(entry => entry.id === `${prefix}-wall-${slots[name]}`);
    level.document.materials.push({ ...(declared ?? libraryMaterial(role)), id });
  }
  for (const [id, color] of [[WALL_TILE_BED, "#737373"], [WALL_TILE_GRIME, "#725139"]]) {
    if (level.architecture.materials.some(material => material.id === id))
      throw new Error(`Reserved kit material ${id} is already declared.`);
    const declared = id === WALL_TILE_BED && prefix !== undefined
      ? level.architecture.materials.find(entry => entry.id === `${prefix}-wall-tile-plaster`) : undefined;
    // Bedding accepts intrinsic PBR channels; source displacement never moves the receiving surface.
    level.document.materials.push(declared ? {
      id, color: declared.color, repeat: declared.repeat, roughness: declared.roughness, metalness: declared.metalness,
      texture: declared.texture, normalTexture: declared.normalTexture, normalScale: declared.normalScale,
      metallicRoughnessTexture: declared.metallicRoughnessTexture,
    } : id === WALL_TILE_BED ? { ...libraryMaterial("tile-bed"), id }
      : { id, color, repeat: 1, roughness: 1, metalness: 0 });
  }
  for (const rule of level.architecture.dressing!.rules) {
    if (rule.kind !== "floor" && (rule.kind !== "wall" || rule.windows)) continue;
    if (rule.tileColor !== undefined) {
      const id = wallTileMaterial(rule.host);
      if (level.architecture.materials.some(material => material.id === id))
        throw new Error(`Reserved kit material ${id} is already declared.`);
      const ceramic = level.document.materials.find(material => material.id === "$kowloon/wall-ceramic")!;
      level.document.materials.push({ ...ceramic, id, color: rule.tileColor });
    }
    if (rule.tilePlasterColor !== undefined) {
      const id = tilePlasterMaterial(rule.host);
      if (level.architecture.materials.some(material => material.id === id))
        throw new Error(`Reserved kit material ${id} is already declared.`);
      const bed = level.document.materials.find(material => material.id === WALL_TILE_BED)!;
      level.document.materials.push({ ...bed, id, color: rule.tilePlasterColor });
    }
    if (rule.kind === "floor") continue;
    const finishes = level.architecture.dressing!.wallMaterials ?? [rule.material];
    for (const [finish, source] of finishes.entries()) {
      const base = level.architecture.materials.find(entry => entry.id === source)!;
      const id = wallBaseMaterial(rule.host, finish);
      if (level.architecture.materials.some(entry => entry.id === id))
        throw new Error(`Reserved kit material ${id} is already declared.`);
      level.document.materials.push({ ...base, id });
    }
  }
}
