export type WorldStyle = "clay" | "chalk" | "night";
export interface WorldTreatment {
  name: string;
  subtitle: string;
  height: number;
  curve: number;
  sky: string;
  ground: string;
  sunColor: string;
  sunIntensity: number;
  sunPosition: [number, number, number];
  hemisphere: string;
  bounce: string;
  fill: number;
  exposure: number;
  colors: string[];
  roughness: number[];
  metalness: number[];
  textures: string[];
}
/** Art direction is explicit data. The same material description reaches the compiler and exporter. */
export const treatments: Record<WorldStyle, WorldTreatment> = {
  clay: {
    name: "Lantern Court",
    subtitle: "Travertine · cedar screens · late-afternoon sun",
    height: 3,
    curve: 3,
    sky: "#d9e3e4",
    ground: "#c9bb9f",
    sunColor: "#ffe4bf",
    sunIntensity: 3.1,
    sunPosition: [-18, -24, 28],
    hemisphere: "#dfefff",
    bounce: "#ad835a",
    fill: 1.05,
    exposure: 1.12,
    colors: [
      "#e7c7a1",
      "#dccfbb",
      "#ede1c8",
      "#dfb594",
      "#82aa9a",
      "#d9d0ba",
      "#aa7b4c",
      "#86714d",
      "#439887",
      "#78502e",
    ],
    roughness: [0.93, 0.86, 0.82, 0.79, 0.4, 0.9, 0.66, 0.42, 0.25, 0.65],
    metalness: [0, 0, 0, 0, 0, 0, 0, 0.65, 0.1, 0],
    textures: [
      "limewash",
      "travertine",
      "travertine",
      "terracotta",
      "zellige",
      "travertine",
      "cedar",
      "brass",
      "zellige",
      "cedar",
    ],
  },
  chalk: {
    name: "Chalk Cloister",
    subtitle: "White limewash · cobalt ceramic · garden court",
    height: 5,
    curve: 6,
    sky: "#d7edf5",
    ground: "#ccc5ae",
    sunColor: "#fff6df",
    sunIntensity: 2.7,
    sunPosition: [14, -20, 35],
    hemisphere: "#effaff",
    bounce: "#b1b8a2",
    fill: 1.5,
    exposure: 1.13,
    colors: [
      "#fbf8ef",
      "#edeae0",
      "#fbf3df",
      "#cb8865",
      "#fff8eb",
      "#dfd5c3",
      "#c7b48d",
      "#2c6085",
      "#6d9165",
      "#407a94",
    ],
    roughness: [0.96, 0.94, 0.85, 0.8, 0.32, 0.82, 0.7, 0.48, 0.85, 0.4],
    metalness: [0, 0, 0, 0, 0, 0, 0, 0.12, 0, 0],
    textures: [
      "limewash",
      "limestone",
      "limestone",
      "terracotta",
      "azulejo",
      "limestone",
      "oak",
      "azulejo",
      "mosaic",
      "oak",
    ],
  },
  night: {
    name: "Slate Atelier",
    subtitle: "Basalt · brushed steel · copper-lit workshop",
    height: 3.5,
    curve: 0,
    sky: "#708a9d",
    ground: "#66737b",
    sunColor: "#cbe2ff",
    sunIntensity: 1.45,
    sunPosition: [-20, 5, 25],
    hemisphere: "#cbddee",
    bounce: "#677889",
    fill: 1.3,
    exposure: 1.25,
    colors: [
      "#9ca7ae",
      "#63737e",
      "#8c9ba3",
      "#838b91",
      "#526c80",
      "#b0b9bb",
      "#7c6961",
      "#d4c5ad",
      "#a45f3c",
      "#526571",
    ],
    roughness: [0.87, 0.94, 0.78, 0.48, 0.65, 0.75, 0.8, 0.36, 0.5, 0.6],
    metalness: [0, 0, 0.1, 0.3, 0.15, 0.12, 0, 0.82, 0.75, 0.45],
    textures: [
      "concrete",
      "basalt",
      "concrete",
      "steel",
      "grid",
      "concrete",
      "charred",
      "copper",
      "copper",
      "steel",
    ],
  },
};
export const materialIds = [
  "plaster",
  "brick",
  "limestone",
  "paving",
  "tile",
  "stone",
  "wood",
  "bronze",
  "teal",
  "gate",
] as const;
const repeats = [1, 0.5, 0.6, 0.5, 0.65, 0.7, 0.65, 1, 0.7, 0.65];
export function materialDescriptions(style: WorldStyle) {
  const t = treatments[style];
  const materials = materialIds.map((id, i) => ({
    id,
    color: t.colors[i],
    texture: `textures/${style}-${t.textures[i]}.png`,
    roughness: t.roughness[i],
    metalness: t.metalness[i],
    repeat: repeats[i],
  }));
  materials.push({
    ...materials[6],
    id: "roof" as (typeof materialIds)[number],
    texture: `textures/${style}-${style === "chalk" ? "terracotta" : style === "night" ? "copper" : "cedar"}.png`,
    color:
      style === "chalk" ? "#c9764a" : style === "night" ? "#b08662" : "#916a42",
  });
  materials.push({
    ...materials[0],
    id: "foliage" as (typeof materialIds)[number],
    color: "#739664",
  });
  materials.push({
    ...materials[0],
    id: "lamp" as (typeof materialIds)[number],
    color: "#ffe3ae",
  });
  return materials;
}
