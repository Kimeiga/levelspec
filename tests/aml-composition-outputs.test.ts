import { test } from "node:test";
import assert from "node:assert/strict";
import { ArchitectureBuilder, compile, collisionMesh } from "levelspec";

/** A single native slab with a larger surrounding decoration tests actual occupied volume. */
function fixture(collidable: boolean, visible: boolean) {
  const builder = new ArchitectureBuilder("output-states");
  builder.document.validation = "premap";
  builder.profile("plan", [
    [0, 0, 0],
    [4, 0, 0],
    [4, 4, 0],
    [0, 4, 0],
  ]);
  builder.slab("floor", "plan", { thickness: 0.2 });
  builder.box("enclosure", {
    position: [-1, -1, -1],
    width: 6,
    depth: 6,
    height: 4,
    collidable,
    visible,
  });
  builder.assembly("physical", [...builder.document.elements]);
  return builder.document;
}
/** Signed closed-surface volume distinguishes missing support from a retained native floor. */
function volume(mesh: { positions: number[]; indices: number[] }) {
  let sum = 0;
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const [a, b, c] = mesh.indices
      .slice(i, i + 3)
      .map((index) => mesh.positions.slice(index * 3, index * 3 + 3));
    sum +=
      a[0] * (b[1] * c[2] - b[2] * c[1]) -
      a[1] * (b[0] * c[2] - b[2] * c[0]) +
      a[2] * (b[0] * c[1] - b[1] * c[0]);
  }
  return Math.abs(sum / 6);
}

test("an enclosing native render-only decoration cannot remove assembled physical floor support", async () => {
  const level = await compile(fixture(false, true), { navigation: false });
  assert.deepEqual(
    level.diagnostics.filter((d) => d.severity === "error"),
    [],
  );
  const physical = collisionMesh(level);
  assert.ok(
    Math.abs(volume(physical) - 3.2) < 1e-6,
    "Native floor volume remains 4×4×0.2 m³",
  );
  assert.ok(
    physical.indices.every(
      (_, i) =>
        i % 3 !== 0 ||
        level.surfaces[physical.surfaces[i / 3]].object === "floor",
    ),
  );
  assert.ok(
    level.mesh.surfaces.some(
      (index) =>
        level.surfaces[index].object === "enclosure" &&
        level.surfaces[index].visible !== false,
    ),
  );
});

test("an enclosing invisible native collision proxy cannot erase the rendered architectural floor", async () => {
  const level = await compile(fixture(true, false), {
    navigation: false,
    retainExportSolids: true,
  });
  assert.deepEqual(
    level.diagnostics.filter((d) => d.severity === "error"),
    [],
  );
  assert.ok(
    level.mesh.surfaces.some(
      (index) =>
        level.surfaces[index].object === "floor" &&
        level.surfaces[index].visible !== false,
    ),
    "The visible floor remains in the renderer",
  );
  const physical = collisionMesh(level);
  assert.ok(
    Math.abs(volume(physical) - 144) < 1e-6,
    "Final physical occupancy has one 6×6×4 m³ envelope",
  );
  const retainedPhysical = level.exportSolids!.filter(
    (solid) => solid.purpose === "physical",
  );
  assert.ok(
    retainedPhysical.length,
    "Closed export operands identify their physical purpose",
  );
  const retainedVolume = retainedPhysical.reduce(
    (total, solid) =>
      total +
      volume({
        positions: solid.positions.flat(),
        indices: solid.triangles.flat(),
      }),
    0,
  );
  assert.ok(
    Math.abs(retainedVolume - 144) < 1e-6,
    "Visual export records cannot duplicate physical occupied volume",
  );
});
