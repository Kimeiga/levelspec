import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { Matrix4 } from "three";
import { compile, createArchitecture } from "../../src/architecture/index.ts";
import { KitMesh } from "../../src/dressing/kit-mesh.ts";
import { kitFinishes, kitMaterials } from "../../src/dressing/kit.ts";
import { Pen } from "../../src/dressing/pen.ts";
import { chooseGarment, hangGarment } from "../../src/dressing/kowloon/laundry.ts";
import { FRUITS, fruit, jar, packet } from "../../src/dressing/kowloon/shop/goods.ts";
import { srgb } from "../../src/dressing/kowloon/palette.ts";
import { Rng } from "../../src/generate/rng.ts";

const destination = "generated/kowloon-asset-pilot/baseline";
const inputs = [
  "src/dressing/kowloon/laundry.ts", "src/dressing/kowloon/shop/goods.ts",
  "src/dressing/kowloon/shop/forms.ts", "src/dressing/kowloon/atlas.ts",
  "src/dressing/kowloon/palette.ts", "src/dressing/pen.ts", "src/dressing/kit-mesh.ts",
  "src/dressing/kit.ts", "src/dressing/geometry.ts", "src/generate/rng.ts",
  "projects/dressing-demo/textures/cloth.png",
];
const hashes = Object.fromEntries(await Promise.all(inputs.map(async path => [
  path, createHash("sha256").update(await readFile(path)).digest("hex"),
])));

/** Reuses a representative plain garment from the existing generator, with its actual cloth atlas. */
function shirt(pen: Pen): void {
  const rng = new Rng("kowloon-asset-pilot/shirt");
  for (let attempt = 0; attempt < 200; attempt++) {
    const garment = chooseGarment(rng, { width: 1.2, drop: 0.9 }, "line");
    if (garment?.kind !== "cut") continue;
    hangGarment(pen, garment, [-0.6, 0, 0.8], [0.6, 0, 0.8], 0);
    return;
  }
  throw new Error("Could not select the procedural plain garment.");
}

const assets: Record<string, (pen: Pen) => void> = {
  "laundry-shirt": shirt,
  "market-apple": pen => fruit(pen, [0, 0, 0], FRUITS.apple, new Rng("kowloon-asset-pilot/apple")),
  "snack-packet": pen => packet(pen, [0, 0, 0], 0.13, 0.2, srgb("#c8281e"), srgb("#e8b82c")),
  "seasoning-jar": pen => jar(pen, [0, 0, 0], 0.055, 0.15, srgb("#a83a1e"), srgb("#c8281e")),
};

await mkdir(destination, { recursive: true });
for (const [id, draw] of Object.entries(assets)) {
  const document = createArchitecture(`pilot-${id}`);
  document.validation = "premap";
  const level = await compile(document, { navigation: false });
  level.mesh.colors = [];
  kitMaterials(level);
  level.document.materials.push({
    id: "pilot-cloth", color: "#ffffff", roughness: 0.95, metalness: 0, repeat: 1,
    texture: "/projects/dressing-demo/textures/cloth.png",
  });
  const { materials } = kitFinishes(level, "pilot", "$kowloon/paint");
  const mesh = new KitMesh(level, id, "pilot", materials, { maximumTriangles: 100000 });
  draw(new Pen(mesh, id, new Matrix4(), false));
  if (!level.mesh.indices.length || level.mesh.positions.some(v => !Number.isFinite(v))) {
    throw new Error(`${id}: baseline has no usable geometry`);
  }
  if (level.surfaces.some(s => s.collidable || s.domain !== "visualization")) {
    throw new Error(`${id}: baseline must be visual only`);
  }
  await writeFile(`${destination}/${id}.json`, JSON.stringify({
    id, coordinates: "meters, right-handed Z-up", front: id === "laundry-shirt" ? "+Y" : "-Y",
    mesh: level.mesh, surfaces: level.surfaces, materials: level.document.materials, sourceHashes: hashes,
  }));
  console.log(`${id}: ${level.mesh.indices.length / 3} triangles`);
}
