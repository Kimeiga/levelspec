import { test } from "node:test";
import assert from "node:assert/strict";
import { Ray, Vector3 } from "three";
import {
  compile,
  parseAml,
  serializeAml,
  collisionMesh,
  toRuntime,
  toGLB,
  exportMetadata,
  ArchitectureBuilder,
  type CompiledArchitecture,
} from "levelspec";

test("adjacent full-span openings leave no blocking end sheets after cutter placement", async () => {
  const level = await build(`
    <path id="a" points="5.52 1.195 8.442; 5.52 1.213 8.442"/>
    <path id="b" points="5.52 1.213 8.441; 5.52 1.231 8.441"/>
    <assembly id="screen">
      <wall id="first" path="a" thickness="0.22" height="7.858"/>
      <wall id="second" path="b" thickness="0.22" height="7.859"/>
    </assembly>
    <opening id="first-cut" host="first" center="0.009 2.5255" width="0.018" height="1.425"/>
    <opening id="second-cut" host="second" center="0.009 2.527" width="0.018" height="1.458"/>
  `);
  valid(level);
  assert.equal(nearest(level, [5.52, 1.2, 11], [0, 1, 0]), Infinity);
  assert.equal(nearest(level, [5.52, 1.228, 11], [0, -1, 0]), Infinity);
  assert.equal(nearest(level, [5, 1.204, 11], [1, 0, 0]), Infinity);
  near(nearest(level, [5, 1.204, 9], [1, 0, 0]), 0.41);
});

/** Compiles public AML without unrelated map circulation assertions. */
async function build(body: string): Promise<CompiledArchitecture> {
  return compile(
    parseAml(
      `<architecture version="1" id="cad" validation="premap">${body}</architecture>`,
    ),
    { navigation: false, floorGaps: false },
  );
}

/** Measures signed volume and exposed area from final triangles, independently of solid builders. */
function measures(level: CompiledArchitecture, material?: string) {
  let volume = 0,
    area = 0;
  for (let t = 0; t < level.mesh.indices.length / 3; t++) {
    if (
      material &&
      level.surfaces[level.mesh.surfaces[t]].material !== material
    )
      continue;
    const [a, b, c] = level.mesh.indices
      .slice(t * 3, t * 3 + 3)
      .map((i) => new Vector3(...level.mesh.positions.slice(i * 3, i * 3 + 3)));
    volume += a.dot(new Vector3().crossVectors(b, c)) / 6;
    area +=
      new Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a)).length() /
      2;
  }
  return { volume, area };
}

/** Tests the final collision surface instead of an authoring guide. */
function nearest(
  level: CompiledArchitecture,
  origin: number[],
  direction: number[],
): number {
  const mesh = collisionMesh(level),
    ray = new Ray(
      new Vector3(...origin),
      new Vector3(...direction).normalize(),
    );
  let distance = Infinity;
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const points = mesh.indices
      .slice(i, i + 3)
      .map((n) => new Vector3(...mesh.positions.slice(n * 3, n * 3 + 3)));
    const point = ray.intersectTriangle(
      points[0],
      points[1],
      points[2],
      false,
      new Vector3(),
    );
    if (point) distance = Math.min(distance, point.distanceTo(ray.origin));
  }
  return distance;
}

/** Keeps numeric expectations explicit and insensitive to triangulation choices. */
function near(actual: number, expected: number, tolerance = 1e-5): void {
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `${actual} != ${expected}`,
  );
}
/** Requires no error while allowing unrelated advisory findings. */
function valid(level: CompiledArchitecture): void {
  assert.deepEqual(
    level.diagnostics.filter((d) => d.severity === "error"),
    [],
  );
}
const materials =
  '<material id="base" color="#aaaaaa"/><material id="accent" color="#bb3322"/>';

test("native assembly composition and explicit CSG have independent volume and exposed area expectations", async () => {
  const cubes =
    '<box id="a" width="2" depth="2" height="2"/><box id="b" width="2" depth="2" height="2" position="1 0 0"/>';
  for (const [operation, volume, area] of [
    ["assembly", 12, 32],
    ["union", 12, 32],
    ["intersect", 4, 16],
    ["subtract", 4, 16],
  ] as const) {
    const level = await build(
      `<${operation} id="result">${cubes}</${operation}>`,
    );
    valid(level);
    near(measures(level).volume, volume);
    near(measures(level).area, area);
    assert.ok(level.provenance.result.contributors.includes("a"));
    assert.ok(level.provenance.result.contributors.includes("b"));
  }
});

test("extrusions and sweeps preserve hollow sections with transformed and reflected local frames", async () => {
  const profile =
    '<profile id="ring" points="-2 -2; 2 -2; 2 2; -2 2"><hole points="-1 -1; -1 1; 1 1; 1 -1"/></profile>';
  for (const operation of [
    '<extrusion id="body" profile="ring" distance="3"/>',
    '<sweep id="body" profile="ring" path="axis"/>',
  ]) {
    const level = await build(
      `${profile}<path id="axis" points="0 0 0; 0 0 3"/>${operation}`,
    );
    valid(level);
    near(measures(level).volume, 36);
    near(measures(level).area, 96);
    assert.equal(nearest(level, [0, 0, 4], [0, 0, -1]), Infinity);
    near(nearest(level, [1.5, 0, 4], [0, 0, -1]), 1);
    const reflected = await build(
      `${profile}<path id="axis" points="0 0 0; 0 0 3"/>${operation.replace("/>", ' scale="-2 1 1" rotation="0 90 0" position="5 0 0"/>')}`,
    );
    valid(reflected);
    near(measures(reflected).volume, 72);
    assert.equal(nearest(reflected, [9, 0, 0], [-1, 0, 0]), Infinity);
    near(nearest(reflected, [9, 0, 3], [-1, 0, 0]), 1);
  }
});

test("opening modes retain webs, expose reveals, and reject meaningless cuts", async () => {
  const wall =
    '<path id="axis" points="0 0 0; 4 0 0"/><wall id="wall" path="axis" thickness="0.2" height="3"/>';
  const aperture =
    '<opening id="cut" host="wall" center="2 1.5" width="1" height="2"/>';
  const through = await build(wall + aperture);
  valid(through);
  near(measures(through).volume, 2);
  assert.equal(nearest(through, [2, -1, 1.5], [0, 1, 0]), Infinity);
  const recess = await build(
    wall + aperture.replace("/>", ' mode="recess" depth="0.05"/>'),
  );
  valid(recess);
  near(measures(recess).volume, 2.3);
  near(nearest(recess, [2, -1, 1.5], [0, 1, 0]), 0.95);
  near(nearest(recess, [2, 1, 1.5], [0, -1, 0]), 0.9);
  for (const cut of [
    aperture.replace('center="2 1.5"', 'center="20 1.5"'),
    aperture.replace("/>", ' mode="notch"/>'),
    aperture.replace("/>", ' mode="recess" depth="0.3"/>'),
  ]) {
    const invalid = await build(wall + cut);
    assert.ok(
      invalid.diagnostics.some(
        (d) =>
          d.severity === "error" && d.objects.includes("cut") && d.source?.line,
      ),
    );
  }
  valid(
    await build(
      wall +
        aperture
          .replace('center="2 1.5"', 'center="0 1.5"')
          .replace("/>", ' mode="notch"/>'),
    ),
  );
});

test("flush material partitions split exposed area without changing physical geometry or hashes", async () => {
  const body = `${materials}<box id="body" width="4" depth="2" height="1" material="base"/>`;
  const partition =
    '<profile id="paint" points="1 0.5; 3 0.5; 3 1.5; 1 1.5"/><face-material id="painted" host="body" face="top" profile="paint" material="accent"/>';
  const plain = await build(body),
    painted = await build(body + partition);
  valid(painted);
  near(measures(painted, "accent").area, 2);
  near(measures(painted).area, 28);
  near(measures(painted).volume, 8);
  assert.equal(painted.physicalHash, plain.physicalHash);
  assert.notEqual(painted.renderHash, plain.renderHash);
  assert.deepEqual(
    collisionMesh(painted).positions,
    collisionMesh(plain).positions,
  );
  const holed = await build(
    body +
      partition.replace(
        "/><face-material",
        '><hole points="1.5 0.75; 2.5 0.75; 2.5 1.25; 1.5 1.25"/></profile><face-material',
      ),
  );
  valid(holed);
  near(measures(holed, "accent").area, 1.5);
  const document = parseAml(
    `<architecture version="1" id="cad" validation="premap">${body}${partition}</architecture>`,
  );
  const roundTrip = await compile(parseAml(serializeAml(document)), {
    navigation: false,
  });
  valid(roundTrip);
  near(measures(roundTrip, "accent").area, 2);
});

test("conflicting exposed materials need explicit ownership independent of member order", async () => {
  const a = '<box id="a" material="base" width="2" depth="2" height="2"/>';
  const b = '<box id="b" material="accent" width="2" depth="2" height="2"/>';
  for (const children of [a + b, b + a]) {
    const conflict = await build(
      `${materials}<assembly id="shell">${children}</assembly>`,
    );
    assert.ok(
      conflict.diagnostics.some(
        (d) =>
          d.code === "AML_MATERIAL_CONFLICT" &&
          d.objects.includes("a") &&
          d.objects.includes("b"),
      ),
    );
    const owned = await build(
      `${materials}<assembly id="shell" material-owner="b">${children}</assembly>`,
    );
    valid(owned);
    near(measures(owned, "accent").area, 24);
    near(measures(owned).volume, 8);
  }
  const buried = await build(
    `${materials}<assembly id="shell">${a}<box id="inside" material="accent" width="1" depth="1" height="1" position="0.5 0.5 0.5"/></assembly>`,
  );
  valid(buried);
  near(measures(buried, "accent").area, 0);
  const partitions = `${materials}<box id="body" material="base"/><face-material id="one" host="body" face="top" material="base"/><face-material id="two" host="body" face="top" material="accent"/>`;
  const conflict = await build(partitions);
  assert.ok(
    conflict.diagnostics.some(
      (d) =>
        d.code === "AML_MATERIAL_CONFLICT" &&
        d.objects.includes("one") &&
        d.objects.includes("two"),
    ),
  );
});

test("declared anchor holes and conflicting wall profiles fail before composition can conceal them", async () => {
  const body =
    '<profile id="floor" points="0 0; 4 0; 4 4; 0 4"><hole points="1 1; 1 3; 3 3; 3 1"/></profile><path id="axis" points="0 2 0; 4 2 0"/><assembly id="shell"><slab id="slab" profile="floor"/><box id="cover" width="4" depth="4"/><wall id="wall" path="axis" base-floor="slab"/></assembly>';
  const level = await build(body);
  assert.ok(
    level.diagnostics.some(
      (d) =>
        d.severity === "error" &&
        d.objects.includes("wall") &&
        d.objects.includes("slab") &&
        d.source?.line,
    ),
  );
  for (const points of ["1 1 0; 4 2 0", "0 1 0; 3 2 0"]) {
    const invalid = await build(
      `<path id="axis" points="0 0 0; 4 0 0"/><path id="top" points="${points}"/><wall id="wall" path="axis" top="top"/>`,
    );
    assert.ok(
      invalid.diagnostics.some(
        (d) => d.severity === "error" && d.objects.includes("wall"),
      ),
    );
  }
});

test("sweeps reject reversal and self intersection and recover for the next public compilation", async () => {
  for (const points of ["0 0 0; 3 0 0; 0 0 0", "0 0 0; 3 3 0; 0 3 0; 3 0 0"]) {
    const invalid = await build(
      `<profile id="section" points="-0.2 -0.2; 0.2 -0.2; 0.2 0.2; -0.2 0.2"/><path id="axis" points="${points}"/><sweep id="sweep" path="axis" profile="section"/>`,
    );
    assert.ok(
      invalid.diagnostics.some(
        (d) => d.severity === "error" && d.objects.includes("sweep"),
      ),
    );
  }
  valid(await build('<box id="recovery"/>'));
});

test("partial coincidence ownership preserves each uniquely exposed material region", async () => {
  const a = '<box id="a" material="base" width="2" depth="2" height="2"/>';
  const b =
    '<box id="b" material="accent" width="2" depth="2" height="2" position="1 0 0"/>';
  for (const children of [a + b, b + a]) {
    const level = await build(
      `${materials}<assembly id="shell" material-owner="b">${children}</assembly>`,
    );
    valid(level);
    near(measures(level, "base").area, 12);
    near(measures(level, "accent").area, 20);
    near(measures(level).area, 32);
    const conflict = await build(
      `${materials}<assembly id="shell">${children}</assembly>`,
    );
    assert.ok(
      conflict.diagnostics.some((d) => d.code === "AML_MATERIAL_CONFLICT"),
    );
  }
});

test("adjacent and same-material overlapping profile partitions preserve physical connectivity", async () => {
  const source = `${materials}<box id="body" width="4" depth="2" height="1" material="base"/>
    <profile id="left" points="0 0; 2 0; 2 2; 0 2"/><profile id="right" points="2 0; 4 0; 4 2; 2 2"/>
    <face-material id="left-paint" host="body" face="top" profile="left" material="base"/>
    <face-material id="right-paint" host="body" face="top" profile="right" material="accent"/>`;
  const level = await build(source);
  valid(level);
  near(measures(level, "accent").area, 4);
  const plain = await build(
    `${materials}<box id="body" width="4" depth="2" height="1" material="base"/>`,
  );
  assert.deepEqual(collisionMesh(level), collisionMesh(plain));
  const same = await build(
    source
      .replace(
        'material="base"/>\n    <face-material',
        'material="accent"/>\n    <face-material',
      )
      .replace('profile="right"', 'profile="left"'),
  );
  valid(same);
  near(measures(same, "accent").area, 4);
});

test("opening reveal assignments and constant-width elliptical frames remain independently physical", async () => {
  const source = `${materials}<path id="axis" points="0 0 0; 4 0 0"/><wall id="wall" path="axis" thickness="0.2" height="3" material="base"/>
    <opening id="cut" host="wall" center="2 1.5" width="1" height="2" reveal-material="accent"/>`;
  const level = await build(source);
  valid(level);
  near(measures(level, "accent").area, 1.2);
  const ellipse = source.replace(
    'width="1" height="2" reveal-material="accent"',
    'shape="ellipse" radii="1 0.5"',
  );
  const framed = await build(
    ellipse +
      '<frame id="frame" opening="cut" depth="0.05" offset="-0.1" border="0.1" material="accent"/>',
  );
  valid(framed);
  assert.equal(nearest(framed, [2, -1, 1.5], [0, 1, 0]), Infinity);
  assert.ok(Number.isFinite(nearest(framed, [2, -1, 1.95], [0, 1, 0])));
  assert.equal(nearest(framed, [2, -1, 1.88], [0, 1, 0]), Infinity);
  const decorative = await build(
    ellipse +
      '<frame id="frame" opening="cut" depth="0.05" offset="-0.1" border="0.1" material="accent" collidable="false"/>',
  );
  valid(decorative);
  assert.equal(nearest(decorative, [2, -1, 1.95], [0, 1, 0]), Infinity);
});

test("bent hollow sweeps use the exact miter plane and local framing under placement", async () => {
  const body =
    '<profile id="section" points="-0.2 -0.1; 0.2 -0.1; 0.2 0.3; -0.2 0.3"><hole points="-0.1 0; -0.1 0.2; 0.1 0.2; 0.1 0"/></profile><path id="axis" points="0 0 0; 2 0 0; 2 2 0"/>';
  const local = await build(
    body + '<sweep id="body" profile="section" path="axis"/>',
  );
  valid(local);
  near(measures(local).volume, 0.48);
  for (const [x, y] of [
    [1.8, 0.2],
    [2.2, -0.2],
  ]) {
    assert.ok(
      local.mesh.positions.some(
        (n, i) =>
          i % 3 === 0 &&
          Math.abs(n - x) < 1e-6 &&
          Math.abs(local.mesh.positions[i + 1] - y) < 1e-6,
      ),
    );
    near(x + y, 2);
  }
  near(nearest(local, [-1, 0, 0.1], [1, 0, 0]), 3.1);
  for (const placed of [
    '<sweep id="body" profile="section" path="axis" rotation="0 89 0" position="4 0 0"/>',
    '<coordinate-frame id="tilt" rotation="0 89 0" position="4 0 0"/><sweep id="body" profile="section" path="axis" frame="tilt"/>',
    '<definition id="module"><sweep id="body" profile="section" path="axis"/></definition><instance id="i" ref="module" rotation="0 89 0" position="4 0 0"/>',
  ]) {
    const level = await build(body + placed);
    valid(level);
    near(measures(level).volume, 0.48);
    const angle = (89 * Math.PI) / 180;
    for (const [x, y, z] of [
      [0, -0.2, -0.1],
      [1.8, 0.2, 0.3],
      [2.2, 2, 0.3],
    ]) {
      const expected = [
        4 + x * Math.cos(angle) + z * Math.sin(angle),
        y,
        -x * Math.sin(angle) + z * Math.cos(angle),
      ];
      assert.ok(
        level.mesh.positions.some(
          (n, i) =>
            i % 3 === 0 &&
            Math.hypot(
              n - expected[0],
              level.mesh.positions[i + 1] - expected[1],
              level.mesh.positions[i + 2] - expected[2],
            ) < 1e-5,
        ),
        `${expected} is a placed section vertex`,
      );
    }
  }
});

test("three-way and nested ownership decisions consider every coincident contributor", async () => {
  for (const children of [
    '<box id="a" material="base"/><box id="b" material="accent"/><box id="c" material="chosen"/>',
    '<box id="c" material="chosen"/><box id="a" material="base"/><box id="b" material="accent"/>',
  ]) {
    const level = await build(
      `${materials}<material id="chosen" color="#44bb22"/><assembly id="outer" material-owner="c"><assembly id="inner">${children}</assembly></assembly>`,
    );
    valid(level);
    near(measures(level, "chosen").area, 6);
    assert.ok(
      level.surfaces.some(
        (surface) =>
          surface.contributors?.includes("a") &&
          surface.contributors.includes("b") &&
          surface.contributors.includes("c"),
      ),
    );
  }
});

test("opening and detail placements use the named host frame for walls and collections", async () => {
  for (const host of [
    '<wall id="host" path="axis" thickness="0.2" height="3"/>',
    '<assembly id="host"><box id="body" width="4" depth="0.2" height="3" position="0 -0.1 0"/></assembly>',
  ]) {
    const source = `<path id="axis" points="0 0 0; 4 0 0"/><coordinate-frame id="shift" position="1 0 0"/>${host}<opening id="cut" host="host" center="1 1.5" width="0.5" height="1" frame="shift"/>`;
    const level = await build(source);
    valid(level);
    assert.equal(nearest(level, [2, -1, 1.5], [0, 1, 0]), Infinity);
    assert.ok(Number.isFinite(nearest(level, [1, -1, 1.5], [0, 1, 0])));
    const detail = await build(
      source +
        '<panel id="panel" opening="cut" depth="0.05" offset="-0.1" position="0 0.5 0"/>',
    );
    valid(detail);
    near(nearest(detail, [2, -1, 1.5], [0, 1, 0]), 1.4);
  }
});

test("notches follow elevated and profiled wall silhouettes and miter apertures leave no filled wedge", async () => {
  const elevated = await build(
    '<path id="axis" points="0 0 2; 4 0 2"/><wall id="host" path="axis" height="3"/><opening id="notch" host="host" center="2 1.5" width="0.5" height="0.8" mode="notch"/>',
  );
  assert.ok(
    elevated.diagnostics.some(
      (d) => d.code === "AML_OPENING" && d.objects.includes("notch"),
    ),
  );
  const profiled = await build(
    '<path id="axis" points="0 0 0; 4 0 0"/><path id="top" points="0 3 0; 4 1 0"/><wall id="host" path="axis" top="top"/><opening id="notch" host="host" center="3.5 1.2" width="0.5" height="0.8" mode="notch"/>',
  );
  valid(profiled);
  const corner = await build(
    '<path id="axis" points="0 0 0; 2 0 0; 2 2 0"/><wall id="host" path="axis" thickness="0.2" height="3"/><opening id="hole" host="host" center="2 1.5" width="1" height="1"/>',
  );
  valid(corner);
  near(nearest(corner, [2.05, -1, 1.5], [0, 1, 0]), 1.5);
});

test("contact bases and transformed soffits use actual native surfaces", async () => {
  const invalid = await build(
    '<profile id="floor" points="0 0; 4 0; 4 2; 0 2"/><path id="axis" points="0 1 0; 4 1 0"/><path id="base" points="0 1 0; 4 1 0"/><slab id="slab" profile="floor"/><wall id="wall" path="axis" base="base" contact-floor="slab"/>',
  );
  assert.ok(
    invalid.diagnostics.some(
      (d) =>
        d.code === "AML_ANCHOR" &&
        d.objects.includes("wall") &&
        d.objects.includes("slab"),
    ),
  );
  for (const scale of ["2 2 2", "2 1 3"]) {
    const level = await build(
      `<profile id="floor" points="0 0; 4 0; 4 2; 0 2"/><path id="axis" points="0 1 0; 4 1 0"/><definition id="module"><slab id="lower" profile="floor"/><slab id="upper" profile="floor" elevation="3" thickness="0.2"/><wall id="wall" path="axis" span-floors="true" base-floor="lower" top-floor="upper"/></definition><instance id="i" ref="module" scale="${scale}"/>`,
    );
    valid(level);
    const top = Math.max(
      ...level.mesh.surfaces.flatMap((surface, t) =>
        level.surfaces[surface].object === "i/wall"
          ? level.mesh.indices
              .slice(t * 3, t * 3 + 3)
              .map((i) => level.mesh.positions[i * 3 + 2])
          : [],
      ),
    );
    near(top, 2.8 * Number(scale.split(" ")[2]));
  }
});

test("new operations honor admission budgets, real cancellation, source immutability and recovery", async () => {
  const source =
    '<architecture version="1" id="limits"><path id="axis" points="0 0 0; 2 0 0; 2 2 0"/><profile id="section" points="-0.2 -0.2; 0.2 -0.2; 0.2 0.2; -0.2 0.2"/><sweep id="body" path="axis" profile="section"/></architecture>';
  const document = parseAml(source),
    before = structuredClone(document);
  const limited = await compile(document, {
    navigation: false,
    limits: { triangles: 10 },
  });
  assert.ok(
    limited.diagnostics.some(
      (d) => d.severity === "error" && /before allocation/.test(d.message),
    ),
  );
  const arch = parseAml(
    '<architecture version="1" id="arch"><path id="axis" points="0 0 0; 4 0 0"/><wall id="wall" path="axis"/><opening id="arch" host="wall" shape="arch" center="2 1.5" width="2" height="3"/></architecture>',
  );
  assert.ok(
    (
      await compile(arch, { navigation: false, limits: { curveSegments: 4 } })
    ).diagnostics.some(
      (d) => d.severity === "error" && /curve segment budget/.test(d.message),
    ),
  );
  const controller = new AbortController();
  await assert.rejects(
    compile(document, {
      navigation: false,
      signal: controller.signal,
      onProgress: (stage) => {
        if (stage === "Resolving face materials") controller.abort();
      },
    }),
    { name: "AbortError" },
  );
  valid(await compile(document, { navigation: false }));
  assert.deepEqual(document, before);
});

test("elliptical frame border uses a true off-axis offset rather than independent axis scaling", async () => {
  const source =
    '<architecture version="1" id="frame" curve-tolerance="0.0001"><path id="axis" points="0 0 0; 4 0 0"/><wall id="wall" path="axis" height="3" thickness="0.2"/><opening id="hole" host="wall" shape="ellipse" center="2 1.5" radii="1 0.5"/><frame id="frame" opening="hole" depth="0.05" offset="-0.1" border="0.1"/></architecture>';
  const level = await compile(parseAml(source), { navigation: false });
  valid(level);
  assert.ok(Number.isFinite(nearest(level, [2.6624, -1, 1.767], [0, 1, 0])));
});

test("transformed material selectors and profile projections follow the host frame", async () => {
  const level = await build(
    `${materials}<profile id="paint" points="1 0; 3 0; 3 1; 1 1"/><box id="body" width="4" depth="2" height="1" material="base" rotation="0 0 90" scale="2 1 1"/><face-material id="paint-assignment" host="body" face="front" projection="xz" profile="paint" material="accent"/>`,
  );
  valid(level);
  near(measures(level, "accent").area, 4);
  const plain = await build(
    `${materials}<box id="body" width="4" depth="2" height="1" material="base" rotation="0 0 90" scale="2 1 1"/>`,
  );
  valid(plain);
  assert.deepEqual(collisionMesh(level), collisionMesh(plain));
});

test("native builder CAD objects survive round trips and export independent collision metadata", async () => {
  const builder = new ArchitectureBuilder("builder-cad");
  builder.document.validation = "premap";
  builder.document.materials.push({
    id: "accent",
    color: "#bb3322",
    repeat: 1,
    roughness: 0.8,
    metalness: 0,
  });
  const body = builder.box("body", { width: 2, depth: 2, height: 2 });
  const tool = builder.solid("box", "tool", {
    width: 2,
    depth: 2,
    height: 2,
    position: [1, 0, 0],
    material: "accent",
  });
  builder.compose("subtract", "cut", [body, tool]);
  const level = await compile(parseAml(serializeAml(builder.document)), {
    navigation: false,
  });
  valid(level);
  near(measures(level).volume, 4);
  near(measures(level, "accent").area, 4);
  const runtime = toRuntime(level),
    metadata = exportMetadata(level, ["glb"]);
  assert.deepEqual(runtime.collision, collisionMesh(level, true));
  assert.deepEqual(metadata.architecturalProvenance?.cut.contributors, [
    "cut",
    "body",
    "tool",
  ]);
  assert.ok(toGLB(level).byteLength > 100);
  builder.faceMaterial("paint", "body", "accent", { face: "top" });
  const painted = await compile(builder.document, { navigation: false });
  valid(painted);
  assert.equal(painted.physicalHash, level.physicalHash);
});

test("moved corner openings and collection notches use transformed bounds and every host component", async () => {
  const moved = await build(
    '<path id="axis" points="0 0 0; 2 0 0; 2 2 0"/><wall id="wall" path="axis" height="3" thickness="0.2"/><opening id="hole" host="wall" center="1 1.5" width="0.5" height="1" position="2 0 0"/>',
  );
  valid(moved);
  assert.equal(nearest(moved, [1, 1, 1.5], [1, 0, 0]), Infinity);
  const notch = await build(
    '<assembly id="host"><box id="a" width="4" depth="0.2" height="3"/><box id="b" width="4" depth="0.2" height="3" position="6 0 0"/></assembly><opening id="hole" host="host" mode="notch" center="6 1.5" width="1" height="1"/>',
  );
  valid(notch);
  assert.equal(nearest(notch, [6.1, -1, 1.5], [0, 1, 0]), Infinity);
});

test("a preferred collection cannot hide conflicting materials within its chosen region", async () => {
  for (const children of [
    '<box id="a" material="base"/><box id="b" material="accent"/>',
    '<box id="b" material="accent"/><box id="a" material="base"/>',
  ]) {
    const level = await build(
      `${materials}<assembly id="shell" material-owner="preferred"><group id="preferred">${children}</group><box id="c"/></assembly>`,
    );
    assert.ok(
      level.diagnostics.some(
        (d) =>
          d.code === "AML_MATERIAL_CONFLICT" &&
          d.objects.includes("a") &&
          d.objects.includes("b"),
      ),
    );
  }
});

test("sweep admission includes every repeated triangulated cap before allocating sections", async () => {
  const interior = Array.from(
    { length: 81 },
    (_, i) => `${0.2 + (i % 9) * 0.2} ${0.2 + Math.floor(i / 9) * 0.2} 0`,
  ).join(";");
  const path = Array.from({ length: 21 }, (_, i) => `0 0 ${i}`).join(";");
  const document = parseAml(
    `<architecture version="1" id="caps"><profile id="section" points="0 0; 2 0; 2 2; 0 2" interior="${interior}"/><path id="axis" points="${path}"/><sweep id="body" path="axis" profile="section"/></architecture>`,
  );
  const result = await compile(document, {
    navigation: false,
    limits: { triangles: 3000 },
  });
  assert.ok(
    result.diagnostics.some(
      (d) => d.objects.includes("body") && /before allocation/.test(d.message),
    ),
  );
});

test("material partitions leave boat navigation and physical collision independent of temporary movement meshes", async () => {
  const base = `${materials}<profile id="floor" points="0 0; 20 0; 20 20; 0 20"/><slab id="bed" profile="floor" material="base"/><water id="water" profile="floor" elevation="3"/><boat radius="1" draft="0.5" height="2"/><marker id="start" position="4 4 3" kind="poi" movement="water"/><marker id="end" position="16 16 3" kind="poi" movement="water"/><route id="boat-route" from="start" to="end" movement="water" min-routes="1" max-distance="20"/>`;
  const plain = await compile(
    parseAml(
      `<architecture version="1" id="water" validation="premap">${base}</architecture>`,
    ),
  );
  const painted = await compile(
    parseAml(
      `<architecture version="1" id="water" validation="premap">${base}<face-material id="paint" host="bed" face="top" material="accent"/></architecture>`,
    ),
  );
  valid(plain);
  valid(painted);
  assert.equal(painted.waterNavigation!.routes[0].reachable, true);
  assert.deepEqual(
    painted.waterNavigation!.positions,
    plain.waterNavigation!.positions,
  );
  assert.deepEqual(
    painted.waterNavigation!.indices,
    plain.waterNavigation!.indices,
  );
  assert.equal(painted.physicalHash, plain.physicalHash);
  assert.deepEqual(collisionMesh(painted), collisionMesh(plain));
  assert.ok(
    collisionMesh(painted).positions.every((z, i) => i % 3 !== 2 || z <= 0),
  );
});

test("explicit retained-face ownership round trips and leaves authored partition conflicts enforceable", async () => {
  const source = `${materials}<assembly id="shell" coincident-material="retained-face"><box id="a" material="base"/><box id="b" material="accent"/></assembly>`;
  const level = await build(source);
  valid(level);
  near(measures(level).volume, 1);
  const document = parseAml(
    `<architecture version="1" id="policy">${source}</architecture>`,
  );
  valid(await compile(parseAml(serializeAml(document)), { navigation: false }));
  const conflict = await build(
    source +
      '<face-material id="one" host="shell" face="top" material="base"/><face-material id="two" host="shell" face="top" material="accent"/>',
  );
  assert.ok(
    conflict.diagnostics.some(
      (d) =>
        d.code === "AML_MATERIAL_CONFLICT" &&
        d.objects.includes("one") &&
        d.objects.includes("two"),
    ),
  );
  const nested = await build(
    `${materials}<assembly id="outer" coincident-material="retained-face"><assembly id="inner" material-owner="b"><box id="a" material="base"/><box id="b" material="accent"/></assembly></assembly>`,
  );
  valid(nested);
  near(measures(nested, "accent").area, 6);
  const strictInner = await build(
    `${materials}<assembly id="outer" coincident-material="retained-face"><assembly id="inner" coincident-material="error"><box id="a" material="base"/><box id="b" material="accent"/></assembly></assembly>`,
  );
  assert.ok(
    strictInner.diagnostics.some((d) => d.code === "AML_MATERIAL_CONFLICT"),
  );
  const incompatible = await build(
    source.replace(
      'coincident-material="retained-face"',
      'coincident-material="retained-face" material-owner="b"',
    ),
  );
  assert.ok(incompatible.diagnostics.some((d) => d.severity === "error"));
  assert.throws(() =>
    parseAml(
      '<architecture version="1" id="invalid"><assembly id="shell" coincident-material="arbitrary"/></architecture>',
    ),
  );
});

test("tall narrow openings retain authored width independently of vertical rounding", async () => {
  const level = await build(`
    <path id="axis" points="0 0 0; 0.01 0 0"/>
    <profile id="aperture" points="0 2000; 0.001 2000; 0.001 3000; 0 3000"/>
    <wall id="wall" path="axis" height="4000" thickness="0.2"/>
    <opening id="cut" host="wall" shape="profile" profile="aperture"/>
  `);
  valid(level);
  assert.equal(nearest(level, [0.0005, -1, 2500], [0, 1, 0]), Infinity);
  near(nearest(level, [0.0015, -1, 2500], [0, 1, 0]), 0.9, 1e-6);
  near(measures(level).volume, 0.01 * 0.2 * 4000 - 0.001 * 0.2 * 1000, 1e-6);
});

test("full-span two-millimeter cuts stay open at world-coordinate slice boundaries", async () => {
  for (const width of [0.002, 0.001]) {
    const definitions = [0, 1]
      .map(
        (
          i,
        ) => `<path id="axis${i}" points="5.52 ${1.438 + i * 0.002} 7.97; 5.52 ${1.44 + i * 0.002} 7.97"/>
      <profile id="cut${i}" points="0 2.117; ${width} 2.117; ${width} 3.878; 0 3.878"/>`,
      )
      .join("");
    const walls = [0, 1]
      .map(
        (i) =>
          `<wall id="wall${i}" path="axis${i}" thickness=".22" height="8.33"/>`,
      )
      .join("");
    const cuts = [0, 1]
      .map(
        (i) =>
          `<opening id="opening${i}" host="wall${i}" shape="profile" profile="cut${i}"/>`,
      )
      .join("");
    const level = await build(
      `${definitions}<assembly id="screen">${walls}</assembly>${cuts}`,
    );
    valid(level);
    for (const offset of [0, 2e-8, -2e-8]) {
      const distance = nearest(
        level,
        [4.52, 1.439 + offset, 10.5],
        [1, 0.001, 0],
      );
      if (width === 0.002) assert.equal(distance, Infinity);
      else
        assert.ok(
          Number.isFinite(distance),
          "The intentionally retained one-millimeter strip still blocks the ray",
        );
    }
    assert.ok(
      (level.repairs ?? []).every(
        (repair) => (repair.maxDisplacement ?? 0) <= 1e-6,
      ),
    );
  }
});
