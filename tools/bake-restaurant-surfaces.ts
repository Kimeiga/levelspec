/** Bakes concept-derived kitchen albedo and aligned roughness/metalness into one padded 512px atlas. */
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { PNG } from "pngjs";

const sourcePath = "projects/kowloon-restaurant-props/concepts/surfaces-source.png";
const bytes = await readFile(sourcePath);
const source = PNG.sync.read(bytes);
const albedo = new PNG({ width: 512, height: 512 });
const properties = new PNG({ width: 512, height: 512 });
const roughness = [.43, .52, .88, .55];
for (let tile = 0; tile < 4; tile++) {
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const u = Math.max(0, Math.min(247, x - 4)) / 247;
    const v = Math.max(0, Math.min(247, y - 4)) / 247;
    const sx = Math.floor((tile % 2 + .01 + u * .98) * source.width / 2);
    const sy = Math.floor((Math.floor(tile / 2) + .01 + v * .98) * source.height / 2);
    const input = (sy * source.width + sx) * 4;
    const output = ((Math.floor(tile / 2) * 256 + y) * 512 + tile % 2 * 256 + x) * 4;
    const silver=(source.data[input]+source.data[input+1]+source.data[input+2])/3;
    for (let c = 0; c < 3; c++) albedo.data[output + c] = tile===0 ? Math.min(255,Math.round(silver*1.16+[0,2,3][c])) : source.data[input + c];
    albedo.data[output + 3] = 255;
    properties.data.set([255, Math.round(roughness[tile] * 255), tile === 0 ? 200 : 0, 255], output);
  }
}
const outputs: Record<string, string> = {};
for (const [suffix, image] of [["", albedo], ["-properties", properties]] as const) {
  const path = `src/materials/library/restaurant-surfaces${suffix}.png`;
  const data = PNG.sync.write(image); await writeFile(path, data);
  outputs[path] = createHash("sha256").update(data).digest("hex");
}
await writeFile("projects/kowloon-restaurant-props/surfaces-bake.json", JSON.stringify({
  source: sourcePath, sourceSha256: createHash("sha256").update(bytes).digest("hex"),
  recipeSha256: createHash("sha256").update(await readFile(import.meta.filename)).digest("hex"),
  width: 512, height: 512, tileSize: 256, padding: 4, outputs,
  channels: "R=unused white, G=roughness, B=metalness. Flat normal: microdetail retained in albedo rather than false relief from color.",
}, null, 2) + "\n");
