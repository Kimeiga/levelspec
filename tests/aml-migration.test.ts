import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  readFile,
  writeFile,
  mkdir,
  readdir,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrateSvgx } from "levelspec/migration";
import {
  parseAml,
  serializeAml,
  compile,
  toGLB,
  createGLBAssetResolver,
  collisionMesh,
} from "levelspec";
import { Ray, Vector3 } from "three";
import { createHash } from "node:crypto";
import { migrateProject } from "../src/cli/migrate.ts";

const source = `<level version="2" id="old" validation="premap"><layer id="ground">
  <vertex id="a" x="0" y="0" z="0"/><vertex id="b" x="4" y="0" z="0"/>
  <vertex id="c" x="4" y="4" z="0"/><vertex id="d" x="0" y="4" z="0"/>
  <edge id="ab" from="a" to="b" kind="wall"><opening id="slice" kind="window" start="1" end="2" sill="1" head="2"/></edge>
  <edge id="bc" from="b" to="c" kind="open"/><edge id="cd" from="c" to="d" kind="open"/><edge id="da" from="d" to="a" kind="open"/>
  <region id="floor" fill="floor" boundary="ab bc cd da"/>
  </layer></level>`;

test("migration retains native source objects and an existing aperture slice", async () => {
  const document = await migrateSvgx(source);
  const opening = document.elements.find((element) => element.id === "slice");
  assert.ok(opening?.kind === "opening");
  assert.equal(opening.shape, "profile");
  assert.deepEqual(document.profiles.find(profile => profile.id === opening.profile)?.outer.points,
    [[1, 1, 0], [2, 1, 0], [2, 2, 0], [1, 2, 0]]);
  const level = await compile(parseAml(serializeAml(document)), {
    navigation: false,
  });
  assert.deepEqual(level.diagnostics, []);
  const physical = collisionMesh(level);
  const crossesWall = (x: number) => {
    const ray = new Ray(new Vector3(x, -1, 1.5), new Vector3(0, 1, 0));
    return physical.indices.some((_, triangle) => {
      if (triangle % 3) return false;
      const [a, b, c] = physical.indices
        .slice(triangle, triangle + 3)
        .map(
          (index) =>
            new Vector3(...physical.positions.slice(index * 3, index * 3 + 3)),
        );
      return ray.intersectTriangle(a, b, c, false, new Vector3()) !== null;
    });
  };
  assert.equal(
    crossesWall(1.5),
    false,
    "The migrated one-metre aperture is physically empty",
  );
  assert.equal(
    crossesWall(0.5),
    true,
    "The adjacent native wall still blocks collision",
  );
});

test("migration requires a frozen native proxy for old physical visualization assets", async () => {
  const physical = source.replace(
    "</level>",
    '<asset id="asset" src="missing.glb"/><prop id="imported" layer="ground" shape="asset" asset="asset" position="0 0 0" collision="solid"/></level>',
  );
  await assert.rejects(migrateSvgx(physical), /requires resolveAsset/);
  const geometry = {
    positions: [
      [0, 0, 0],
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ] as [number, number, number][],
    triangles: [
      [0, 2, 1],
      [0, 1, 3],
      [0, 3, 2],
      [1, 2, 3],
    ] as [number, number, number][],
  };
  const migrated = await migrateSvgx(physical, {
    resolveAsset: async () => geometry,
  });
  assert.ok(
    migrated.elements.some(
      (element) =>
        element.kind === "visual-mesh" && element.collidable === false,
    ),
  );
  assert.ok(
    migrated.elements.some(
      (element) =>
        element.kind === "faceted-solid" && element.visible === false,
    ),
  );
});

test("mechanical migration retains round ends, cylinder bounds proxies, and unsnapped rotated box placement", async () => {
  const extras =
    '<prop id="cylinder" layer="ground" shape="cylinder" position="10 0 0" scale="2 2 2" collision="box"/>' +
    '<prop id="triangle-cylinder" layer="ground" shape="cylinder" position="14 0 0" scale="2 2 2" segments="3" collision="box"/>' +
    '<prop id="rotated" layer="ground" shape="box" position="20 0 0" rotation="0 0 45" scale="1 1 1" collision="solid"/>';
  const document = await migrateSvgx(
    source
      .replace('kind="wall"', 'kind="wall" join="round"')
      .replace("</level>", `${extras}</level>`),
  );
  const level = await compile(document, { navigation: false }),
    mesh = collisionMesh(level);
  assert.deepEqual(level.diagnostics, []);
  const walls = level.mesh.surfaces.flatMap((surface, triangle) =>
    level.surfaces[surface].object === "ab"
      ? level.mesh.indices
          .slice(triangle * 3, triangle * 3 + 3)
          .map((index) => level.mesh.positions[index * 3])
      : [],
  );
  assert.ok(Math.abs(Math.min(...walls) + 0.11) < 0.000001);
  assert.ok(Math.abs(Math.max(...walls) - 4.11) < 0.000001);
  const ray = new Ray(new Vector3(10.9, 0.9, -1), new Vector3(0, 0, 1));
  assert.ok(
    mesh.indices.some((_, i) => {
      if (i % 3) return false;
      const [a, b, c] = mesh.indices
        .slice(i, i + 3)
        .map(
          (index) =>
            new Vector3(...mesh.positions.slice(index * 3, index * 3 + 3)),
        );
      return ray.intersectTriangle(a, b, c, false, new Vector3()) !== null;
    }),
    "A bounds proxy retains collision at the cylinder's square corner",
  );
  const ys = level.mesh.surfaces.flatMap((surface, triangle) =>
    level.surfaces[surface].object === "rotated"
      ? level.mesh.indices
          .slice(triangle * 3, triangle * 3 + 3)
          .map((index) => level.mesh.positions[index * 3 + 1])
      : [],
  );
  assert.ok(Math.abs(Math.min(...ys) + Math.SQRT1_2) < 0.000001);
  assert.ok(Math.abs(Math.max(...ys) - Math.SQRT1_2) < 0.000001);
  const proxy = mesh.surfaces.flatMap((surface, triangle) =>
    level.surfaces[surface].object === "triangle-cylinder:collision"
      ? mesh.indices
          .slice(triangle * 3, triangle * 3 + 3)
          .map((index) => mesh.positions.slice(index * 3, index * 3 + 3))
      : [],
  );
  assert.ok(Math.abs(Math.min(...proxy.map((p) => p[0])) - 13.5) < 0.000001);
  assert.ok(
    Math.abs(Math.max(...proxy.map((p) => p[1])) - Math.sqrt(3) / 2) < 0.000001,
  );
});

test("generated migration identities cannot collide with existing metadata and ability links remain explicit", async () => {
  const xml = source.replace(
    "</level>",
    '<player ladder="true"/><marker id="start" layer="ground" region="floor" position="1 1 0" kind="spawn"/>' +
      '<route id="ab:path" from="start" to="start" min-routes="1"/><link id="ladder" from="1 1 0" to="3 3 0" kind="ladder" ability="ladder" from-area="floor" to-area="floor"/></level>',
  );
  const document = parseAml(serializeAml(await migrateSvgx(xml)));
  const level = await compile(document, { navigation: false });
  assert.deepEqual(level.diagnostics, []);
  assert.equal(level.document.links[0].ability, "ladder");
  assert.equal(level.document.player.ladder, true);
  assert.equal(document.routes[0].id, "ab:path");
});

test("project migration never overwrites a destination and recovers after missing companions", async () => {
  const root = await mkdtemp(join(tmpdir(), "aml-migration-"));
  try {
    const input = join(root, "old.level.svgx"),
      output = join(root, "new");
    await writeFile(input, source);
    await mkdir(output);
    await writeFile(join(output, "owned.txt"), "retained");
    await assert.rejects(migrateProject(input, output));
    assert.equal(await readFile(join(output, "owned.txt"), "utf8"), "retained");
    assert.equal(await readFile(input, "utf8"), source);
    await rm(output, { recursive: true });
    await writeFile(
      input,
      source.replace(
        "</level>",
        '<asset id="asset" src="missing.glb"/><prop id="imported" layer="ground" shape="asset" asset="asset" position="0 0 0" collision="solid"/></level>',
      ),
    );
    await assert.rejects(migrateProject(input, output));
    assert.ok(!(await readdir(root)).includes("new"));
    assert.match(await readFile(input, "utf8"), /missing.glb/);
    await writeFile(input, source);
    const result = await migrateProject(input, output);
    assert.equal(
      parseAml(await readFile(join(output, "level.aml"), "utf8")).id,
      "old",
    );
    assert.ok(result.artifacts.some((path) => path.endsWith("migration.json")));
    assert.equal(await readFile(input, "utf8"), source);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("migrated companions remain portable and preserve transformed solid versus box proxies", async () => {
  const root = await mkdtemp(join(tmpdir(), "aml-companions-"));
  try {
    const asset = await compile(
      parseAml(
        '<architecture version="1" id="wedge"><wedge id="body" width="1" depth="2" height="3"/></architecture>',
      ),
      { navigation: false },
    );
    const bytes = toGLB(asset),
      assetFile = join(root, "original.glb"),
      input = join(root, "old.level.svgx");
    await writeFile(assetFile, bytes);
    for (const collision of ["solid", "box"] as const) {
      await writeFile(
        input,
        source.replace(
          "</level>",
          `<asset id="asset" src="original.glb"/><prop id="imported" layer="ground" shape="asset" asset="asset" position="10 0 0" rotation="0 0 90" scale="2 1 1" collision="${collision}"/></level>`,
        ),
      );
      const output = join(root, collision),
        result = await migrateProject(input, output);
      assert.ok(
        result.artifacts.some((path) =>
          /companions\/[a-f0-9]{64}\.glb$/.test(path),
        ),
      );
      const manifest = JSON.parse(
        await readFile(join(output, "migration.json"), "utf8"),
      );
      const sha256 = createHash("sha256").update(bytes).digest("hex");
      assert.equal(manifest.companions[0].sha256, sha256);
      const document = parseAml(
        await readFile(join(output, "level.aml"), "utf8"),
      );
      const visual = document.elements.find(
        (element) => element.kind === "visual-mesh",
      );
      assert.ok(visual?.kind === "visual-mesh");
      assert.match(visual.src, /^companions\/[a-f0-9]{64}\.glb$/);
      assert.equal(visual.src, `companions/${sha256}.glb`);
      assert.deepEqual(
        await readFile(join(output, visual.src)),
        Buffer.from(bytes),
      );
      const level = await compile(document, {
        navigation: false,
        resolveAsset: createGLBAssetResolver((reference) =>
          readFile(join(output, reference)),
        ),
      });
      assert.deepEqual(level.diagnostics, []);
      const mesh = collisionMesh(level),
        ray = new Ray(new Vector3(9, 1.5, -1), new Vector3(0, 0, 1)),
        heights: number[] = [];
      for (let i = 0; i < mesh.indices.length; i += 3) {
        const [a, b, c] = mesh.indices
          .slice(i, i + 3)
          .map(
            (index) =>
              new Vector3(...mesh.positions.slice(index * 3, index * 3 + 3)),
          );
        const hit = ray.intersectTriangle(a, b, c, false, new Vector3());
        if (hit) heights.push(hit.z);
      }
      assert.ok(
        Math.abs(Math.min(...heights) - (collision === "solid" ? 2.25 : 0)) <
          0.0001,
        collision,
      );
    }
    await rm(assetFile);
    await rm(input);
    const output = join(root, "solid"),
      document = parseAml(await readFile(join(output, "level.aml"), "utf8"));
    const level = await compile(document, {
      navigation: false,
      resolveAsset: createGLBAssetResolver((reference) =>
        readFile(join(output, reference)),
      ),
    });
    assert.deepEqual(level.diagnostics, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("mechanical wall material ownership preserves historical exposed regions explicitly", async () => {
  const records = JSON.parse(
    await readFile(
      new URL("./fixtures/migration-material-oracles.json", import.meta.url),
      "utf8",
    ),
  );
  /** Samples the nearest exposed render face, independently of native provenance metadata. */
  const materialAt = (
    level: Awaited<ReturnType<typeof compile>>,
    origin: number[],
    direction: number[],
  ) => {
    const ray = new Ray(
      new Vector3(...origin),
      new Vector3(...direction).normalize(),
    );
    let distance = Infinity,
      material: string | undefined;
    for (let t = 0; t < level.mesh.surfaces.length; t++) {
      const surface = level.surfaces[level.mesh.surfaces[t]];
      if (surface.visible === false) continue;
      const points = level.mesh.indices
        .slice(t * 3, t * 3 + 3)
        .map(
          (i) => new Vector3(...level.mesh.positions.slice(i * 3, i * 3 + 3)),
        );
      const hit = ray.intersectTriangle(
        points[0],
        points[1],
        points[2],
        false,
        new Vector3(),
      );
      if (hit && hit.distanceTo(ray.origin) < distance - 1e-7) {
        distance = hit.distanceTo(ray.origin);
        material = surface.material;
      }
    }
    return { distance, material };
  };
  const compact =
    '<level version="2" id="coincident" validation="premap"><material id="red" color="#ff0000"/><material id="blue" color="#0000ff"/><layer id="walls"><vertex id="a" x="0" y="0" z="0"/><vertex id="b" x="4" y="0" z="0"/><edge id="first" from="a" to="b" kind="wall" height="3" material="red"/><edge id="second" from="a" to="b" kind="wall" height="3" material="blue"/></layer></level>';
  const showcase = await readFile(
    new URL("./fixtures/migration/showcase.level.svgx", import.meta.url),
    "utf8",
  );
  for (const legacy of [compact, showcase]) {
    const migrated = await migrateSvgx(legacy);
    const record = records.find(
      (entry: { sourceSha256: string }) =>
        entry.sourceSha256 ===
        createHash("sha256").update(legacy).digest("hex"),
    );
    assert.ok(record);
    const level = await compile(parseAml(serializeAml(migrated)), {
      navigation: false,
    });
    assert.deepEqual(
      level.diagnostics.filter((d) => d.severity === "error"),
      [],
    );
    assert.ok(
      migrated.elements.some(
        (element) =>
          element.kind === "assembly" &&
          element.coincidentMaterial === "retained-face",
      ),
    );
    for (const expected of record.samples) {
      const after = materialAt(level, expected.origin, expected.direction);
      assert.equal(
        after.material,
        expected.material,
        `Exposed material at ${expected.origin}`,
      );
      const before = expected.distance ?? Infinity;
      assert.ok(
        before === after.distance || Math.abs(before - after.distance) < 1e-5,
        `Exposed plane at ${expected.origin}`,
      );
    }
  }
});


test("migration preserves odd-millimeter opening bounds without moving half-grid centers", async () => {
  for (const width of [.005, .035]) {
    const old = `<level version="2" id="thin" validation="premap"><layer id="screen">
      <vertex id="a" x="0" y="0" z="0"/><vertex id="b" x="${width}" y="0" z="0"/>
      <edge id="wall" from="a" to="b" kind="wall" height="4" thickness=".22">
        <opening id="cut" start="0" end="${width}" sill="1.813" head="3.238" kind="window"/>
      </edge></layer></level>`;
    const level = await compile(parseAml(serializeAml(await migrateSvgx(old))), { navigation: false });
    assert.deepEqual(level.diagnostics, []);
    const mesh = collisionMesh(level);
    let volume = 0;
    for (let i = 0; i < mesh.indices.length; i += 3) {
      const [a,b,c] = mesh.indices.slice(i,i+3).map(index => new Vector3(...mesh.positions.slice(index*3,index*3+3)));
      volume += a.dot(new Vector3().crossVectors(b,c))/6;
    }
    assert.ok(Math.abs(volume - width*.22*(4-(3.238-1.813))) < 1e-7);
    for (const [x,z] of [[.00025,2],[width-.00025,2],[width/2,1.81325],[width/2,3.23775]]) {
      const ray = new Ray(new Vector3(x,-1,z),new Vector3(0,1,0));
      for (let i = 0; i < mesh.indices.length; i += 3) {
        const [a,b,c] = mesh.indices.slice(i,i+3).map(index => new Vector3(...mesh.positions.slice(index*3,index*3+3)));
        assert.equal(ray.intersectTriangle(a,b,c,false,new Vector3()), null, `Unchanged opening at ${x},${z}`);
      }
    }
  }
});
