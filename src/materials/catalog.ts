import type { Material } from "../vector/types.ts";
import type { ArchitectureDocument } from "../architecture/types.ts";

/** Shipped intrinsic PBR definitions. Repeat is cycles per meter, never an object-size fit. */
const LIBRARY = {
  "concrete": {"color": "#ffffff", "repeat": 0.125, "roughness": 0.96, "metalness": 0.0, "texture": "levelspec-material:concrete-shared.png", "normalTexture": "levelspec-material:concrete-shared-normal.png", "normalScale": 1.0},
  "roofing": {"color": "#ffffff", "repeat": 0.65, "roughness": 0.88, "metalness": 0.0, "texture": "levelspec-material:roofing.png"},
  "lettering": {"color": "#ffffff", "repeat": 1.0, "roughness": 0.75, "metalness": 0.0, "texture": "levelspec-material:lettering.png", "alphaCutoff": 0.5},
  "signboard": {"color": "#ffffff", "repeat": 0.8, "roughness": 0.7, "metalness": 0.0, "texture": "levelspec-material:signboard.png"},
  "rust": {"color": "#ffffff", "repeat": 2.0, "roughness": 0.92, "metalness": 0.2, "texture": "levelspec-material:rust.png"},
  "metal": {"color": "#ffffff", "repeat": 1.4, "roughness": 0.6, "metalness": 0.2, "texture": "levelspec-material:metal.png"},
  "sheet": {"color": "#ffffff", "repeat": 1.6, "roughness": 0.6, "metalness": 0.3, "texture": "levelspec-material:sheet.png"},
  "timber": {"color": "#ffffff", "repeat": 1.5, "roughness": 0.8, "metalness": 0.0, "texture": "levelspec-material:timber.png"},
  "restaurant-food": {"color": "#ffffff", "repeat": 1.0, "roughness": 1.0, "metalness": 1.0, "texture": "levelspec-material:restaurant-food.png", "normalTexture": "levelspec-material:restaurant-food-normal.png", "metallicRoughnessTexture": "levelspec-material:restaurant-food-properties.png"},
  "brushed-metal": {"color": "#ffffff", "repeat": 2.0, "roughness": 1.0, "metalness": 1.0, "texture": "levelspec-material:brushed-metal.png", "normalTexture": "levelspec-material:brushed-metal-normal.png", "metallicRoughnessTexture": "levelspec-material:brushed-metal-properties.png"},
  "restaurant-tiles": {"color": "#ffffff", "repeat": 1.0, "roughness": 1.0, "metalness": 1.0, "texture": "levelspec-material:restaurant-tiles.png", "normalTexture": "levelspec-material:restaurant-tiles-normal.png", "metallicRoughnessTexture": "levelspec-material:restaurant-tiles-properties.png"},
  "restaurant-surfaces": {"color": "#ffffff", "repeat": 1.0, "roughness": 1.0, "metalness": 1.0, "texture": "levelspec-material:restaurant-surfaces.png", "metallicRoughnessTexture": "levelspec-material:restaurant-surfaces-properties.png"},
  "shop-timber": {"color": "#ffffff", "repeat": 1.0, "roughness": 1.0, "metalness": 1.0, "texture": "levelspec-material:shop-timber.png", "normalTexture": "levelspec-material:shop-timber-normal.png", "metallicRoughnessTexture": "levelspec-material:shop-timber-properties.png"},
  "market-apple": {"color": "#ffffff", "repeat": 1.0, "roughness": 0.48, "metalness": 0.0, "texture": "levelspec-material:market-apple.png"},
  "grocer-props": {"color": "#ffffff", "repeat": 1.0, "roughness": 1.0, "metalness": 1.0, "texture": "levelspec-material:grocer-props.png", "normalTexture": "levelspec-material:grocer-props-normal.png", "metallicRoughnessTexture": "levelspec-material:grocer-props-properties.png"},
  "snack-packet": {"color": "#ffffff", "repeat": 1.0, "roughness": 0.55, "metalness": 0.0, "texture": "levelspec-material:snack-packet.png"},
  "balcony-cloth": {color: "#ffffff", repeat: 1, roughness: 1, metalness: 1, texture: "levelspec-material:balcony-cloth.png", normalTexture: "levelspec-material:balcony-cloth-normal.png", metallicRoughnessTexture: "levelspec-material:balcony-cloth-properties.png"},
  "balcony-plants": {color: "#ffffff", repeat: 1, roughness: 1, metalness: 1, texture: "levelspec-material:balcony-plants.png", normalTexture: "levelspec-material:balcony-plants-normal.png", metallicRoughnessTexture: "levelspec-material:balcony-plants-properties.png"},
  "cloth": {"color": "#ffffff", "repeat": 1.0, "roughness": 0.95, "metalness": 0.0, "texture": "levelspec-material:cloth.png"},
  "tarp": {"color": "#ffffff", "repeat": 0.6666666666666666, "roughness": 1.0, "metalness": 0.0, "texture": "levelspec-material:tarp.png", "normalTexture": "levelspec-material:tarp-normal.png", "normalScale": 0.7, "metallicRoughnessTexture": "levelspec-material:tarp-properties.png"},
  "aircon": {"color": "#ffffff", "repeat": 1.0, "roughness": 0.6, "metalness": 0.15, "texture": "levelspec-material:aircon.png"},
  "ceramic": {"color": "#ffffff", "repeat": 2.5, "roughness": 0.68, "metalness": 0.0, "texture": "levelspec-material:wall-ceramic-weathered.png", "normalTexture": "levelspec-material:wall-ceramic-normal.png", "normalScale": 0.55},
  "tile-bed": {"color": "#aaa69a", "repeat": 0.125, "roughness": 0.96, "metalness": 0.0, "texture": "levelspec-material:concrete-shared.png", "normalTexture": "levelspec-material:concrete-shared-normal.png", "normalScale": 0.4},
  "wall-metal": {"color": "#ffffff", "repeat": 2.0, "roughness": 0.68, "metalness": 0.55, "texture": "levelspec-material:wall-metal-weathered.png", "normalTexture": "levelspec-material:wall-metal-normal.png", "normalScale": 0.45},
  "wall-rust": {"color": "#bcb0a0", "repeat": 2.0, "roughness": 0.88, "metalness": 0.25, "texture": "levelspec-material:wall-metal-weathered.png", "normalTexture": "levelspec-material:wall-metal-normal.png", "normalScale": 0.65},
  "wall-cable": {"color": "#292721", "repeat": 4.0, "roughness": 0.87, "metalness": 0.0, "texture": "levelspec-material:wall-metal-weathered.png", "normalTexture": "levelspec-material:wall-metal-normal.png", "normalScale": 0.18},
  "wall-posters": {"color": "#ffffff", "repeat": 1.0, "roughness": 0.96, "metalness": 0.0, "texture": "levelspec-material:posters-atlas.jpg"},
  "render-weathered": {"color": "#ffffff", "repeat": 0.125, "roughness": 0.96, "metalness": 0.0, "texture": "levelspec-material:concrete-shared.png", "normalTexture": "levelspec-material:concrete-shared-normal.png", "normalScale": 1.0},
  "render-repair": {"color": "#ffffff", "repeat": 0.5, "roughness": 0.88, "metalness": 0.0, "texture": "levelspec-material:building-plaster-plain.png"},
  "asphalt": {"color": "#ffffff", "repeat": 0.6666666666666666, "roughness": 0.94, "metalness": 0.0, "texture": "levelspec-material:ground-asphalt.png", "normalTexture": "levelspec-material:ground-asphalt-normal.png", "normalScale": 1.15},
  "plaster": {"color": "#ffffff", "repeat": 0.5, "roughness": 0.9, "metalness": 0.0, "texture": "levelspec-material:building-plaster-plain.png"},
} satisfies Record<string, Omit<Material, "id">>;

export type MaterialRole = keyof typeof LIBRARY;

/** Returns an independent definition; catalog defaults never mutate authored overrides. */
export function libraryMaterial(role: MaterialRole): Material {
  return { id: `builtin:${role}`, ...LIBRARY[role] };
}

/** Registers a semantic default once, without loading any image bytes. */
export function bindLibraryMaterial(materials: Material[], role: MaterialRole): string {
  const id = `builtin:${role}`;
  if (!materials.some(material => material.id === id)) materials.push(libraryMaterial(role));
  return id;
}

/** Resolves explicit library references in a compiler-owned source clone. Authored IDs remain separate. */
export function registerLibraryMaterials(document: ArchitectureDocument): void {
  for (const material of document.materials) {
    if (!material.id.startsWith("builtin:")) continue;
    const role = material.id.slice("builtin:".length);
    if (!Object.hasOwn(LIBRARY, role)) throw new Error(`Unknown library material ${material.id}.`);
    const expected = libraryMaterial(role as MaterialRole);
    const fields = new Set([...Object.keys(expected), ...Object.keys(material)].filter(key => key !== "source"));
    if ([...fields].some(key => material[key as keyof Material] !== expected[key as keyof Material]))
      throw new Error("builtin: definitions are reserved; use a named AML material to override a finish.");
  }
  for (const rule of document.dressing?.rules ?? [])
    rule.material ??= rule.kind === "floor" ? "builtin:concrete" : "builtin:plaster";
  const references = new Set<string>();
  const visit = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      if (["material", "asphaltMaterial", "revealMaterial"].includes(key) && typeof child === "string") references.add(child);
      else if (key === "wallMaterials" && Array.isArray(child)) child.forEach(id => references.add(id));
      else if (typeof child === "object") visit(child);
    }
  };
  visit(document.elements); visit(document.definitions); visit(document.dressing);
  for (const id of references) {
    if (!id.startsWith("builtin:")) continue;
    const role = id.slice("builtin:".length);
    if (!Object.hasOwn(LIBRARY, role)) throw new Error(`Unknown library material ${id}.`);
    bindLibraryMaterial(document.materials, role as MaterialRole);
  }
}
