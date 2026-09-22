import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
const [input = "website-qa/bakes-v1"] = process.argv.slice(2),
  root = "website/assets/bakes";
await mkdir(root, { recursive: true });
const catalog = [];
for (const style of ["clay", "chalk", "night"]) {
  const from = `${input}/${style}`,
    to = `${root}/${style}`;
  await mkdir(to, { recursive: true });
  const level = JSON.parse(await readFile(`${from}/compiled.json`, "utf8"));
  const source = await readFile(`${from}/source.level.svgx`, "utf8");
  const manifest = JSON.parse(
    await readFile(`${from}/${level.document.id}.lighting.json`, "utf8"),
  );
  const uv1 = level.mesh.indices.flatMap((v: number) =>
    level.mesh.uv1.slice(v * 2, v * 2 + 2),
  );
  const corners = level.mesh.indices.flatMap((v: number) =>
    level.mesh.positions.slice(v * 3, v * 3 + 3),
  );
  const sourceHash = createHash("sha256").update(source).digest("hex");
  const binding = {
    sourceHash,
    geometryHash: level.geometryHash,
    cornerHash: createHash("sha256")
      .update(JSON.stringify(corners))
      .digest("hex"),
    uv1,
    pages: level.mesh.atlasPages,
    atlas: level.atlas,
    manifest,
  };
  await writeFile(
    `${to}/binding.json.gz`,
    gzipSync(JSON.stringify(binding), { level: 9 }),
  );
  for (const page of manifest.pages)
    for (const image of [page, ...page.mips])
      await copyFile(`${from}/${image.file}`, `${to}/${image.file}`);
  await copyFile(`${from}/calibration.json`, `${to}/calibration.json`);
  catalog.push({
    style,
    sourceHash,
    binding: `${style}/binding.json.gz`,
    samples: manifest.samples,
  });
}
await writeFile(`${root}/catalog.json`, JSON.stringify(catalog, null, 2));
console.log(
  "Packaged validated baked lightmaps for three exact source presets.",
);
