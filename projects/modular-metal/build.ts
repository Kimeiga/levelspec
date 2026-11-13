/** Builds a real shared-material GLB study with a table, shelves, and hollow cookware. */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { Matrix4 } from "three";
import { compile, parseAml, resolveExportAssets, toGLB } from "levelspec";
import { kitFinishes, kitMaterials } from "../../src/dressing/kit.ts";
import { KitMesh } from "../../src/dressing/kit-mesh.ts";
import { Pen } from "../../src/dressing/pen.ts";
import type { V3 } from "../../src/architecture/types.ts";
import { brushedMetal } from "../../src/dressing/finish/brushed-metal.ts";
import { lathe } from "../../src/dressing/kowloon/shop/forms.ts";

const output = "generated/modular-metal";
const variants = [["table", 1], ["pot", .65]] as const;
const materials = variants.map(([name, roughness]) => `<material id="${name}-brushed-metal" color="#ffffff" repeat="2" roughness="${roughness}" metalness="1" texture="brushed-metal.png" normal-texture="brushed-metal-normal.png" metallic-roughness-texture="brushed-metal-properties.png"/>`).join("\n");
const level = await compile(parseAml(`<architecture version="1" id="metal-study">${materials}<material id="floor" color="#41464a"/><box id="ground" position="0 0 -.08" width="5" depth="3" height=".08" material="floor"/></architecture>`), { navigation: false });
kitMaterials(level);
level.mesh.colors ??= level.mesh.positions.map(() => 1);

/** Shares the same image references across independent material factors and fixture frames. */
function pen(name: string, x: number): Pen {
  const mesh = new KitMesh(level, name, "study", kitFinishes(level, name === "shelf" ? "table" : name, "floor").materials, { maximumTriangles: 10000 });
  return brushedMetal(new Pen(mesh, name, new Matrix4().makeTranslation(x, .8, 0), false));
}

/** Thin folded sheet with a narrow physical bevel to catch moving highlights. */
function panel(p: Pen, width: number, depth: number, z: number): void {
  const b = .004, low = z - .028;
  p.box("metal", [0, 0, low], [width, depth, z - b], [1, 1, 1], "u");
  p.face("metal", [[b,b,z],[width-b,b,z],[width-b,depth-b,z],[b,depth-b,z]], [0,0,1], [1,1,1]);
  const outside: V3[] = [[0,0,z-b],[width,0,z-b],[width,depth,z-b],[0,depth,z-b]];
  const inside: V3[] = [[b,b,z],[width-b,b,z],[width-b,depth-b,z],[b,depth-b,z]];
  const hints: V3[] = [[0,-1,1],[1,0,1],[0,1,1],[-1,0,1]];
  for (let i = 0; i < 4; i++) p.face("metal", [outside[i], outside[(i+1)%4], inside[(i+1)%4], inside[i]], hints[i], [1,1,1]);
}

const table = pen("table", .2);
panel(table, 1.4, .7, .9);
for (const x of [.04,1.32]) for (const y of [.04,.62]) table.box("metal", [x,y,0], [x+.035,y+.035,.872], [.9,.9,.9], "");
panel(table, 1.32, .62, .23);
const shelf = pen("shelf", 2.15);
for (const z of [.25,.7,1.15]) panel(shelf, 1.05, .43, z);
for (const x of [.015,.995]) for (const y of [.015,.375]) shelf.box("metal", [x,y,0], [x+.025,y+.025,1.3], [.86,.86,.86], "");
const pot = pen("pot", .45);
lathe(pot, "metal", [.32,.34,.9], [[0,0],[.19,0],[.205,.016],[.21,.04],[.21,.30],[.216,.31],[.216,.32],[.205,.324],[.2,.316],[.2,.045],[.185,.025],[0,.025]], [1,1,1], 40, 2);
lathe(pot, "metal", [.88,.32,.9], [[0,0],[.12,0],[.14,.015],[.16,.13],[.164,.14],[.153,.145],[.15,.132],[.13,.025],[0,.025]], [1,1,1], 40, 2);
for (const side of [-1,1]) {
  pot.box("metal", [.32+side*.25-.04,.31,1.14], [.32+side*.25+.04,.37,1.155], [.86,.86,.86], "");
}
const assets = await resolveExportAssets(level, reference => readFile(`projects/dressing-demo/textures/${reference}`));
const bytes = toGLB(level, { assets });
await mkdir(output, { recursive: true });
await writeFile(`${output}/study.glb`, bytes);
await writeFile(`${output}/build.json`, JSON.stringify({ bytes: bytes.byteLength, triangles: level.mesh.indices.length/3,
  variants: { table: 1, shelf: 1, pot: .65 }, textures: Object.keys(assets) }, null, 2));
console.log(`${output}/study.glb: ${bytes.byteLength} bytes, ${level.mesh.indices.length/3} triangles`);
