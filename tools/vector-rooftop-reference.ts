import { mkdir, writeFile } from "node:fs/promises";
import { PNG } from "pngjs";
import {
  SceneBuilder,
  compile,
  validateForRuntime,
  serializeLevelSvgx,
  projectReference,
  renderReference,
  type ReferenceView,
  type V3,
} from "../src/vector/index.ts";

const WIDTH = 640, HEIGHT = 400;
const scene = new SceneBuilder("rooftop-reference");
scene.document.name = "Rooftop reference acceptance";
scene.material("concrete", { color: "#a9aaa4", roughness: 0.92 });
scene.material("glass", { color: "#385762", roughness: 0.2, metalness: 0.05 });
scene.material("metal", { color: "#6e7880", roughness: 0.45, metalness: 0.65 });
scene.material("paint", { color: "#c17f47", roughness: 0.72 });
const district = scene.group("district", { origin: [-6, -5, 0] }),
  building = district.building("main", {
    size: [12, 10, 8],
    material: "concrete",
    usage: "roof",
  });
building.facade("south", {
  rows: 4,
  columns: 6,
  material: "glass",
  window: [1.1, 1.25],
  margin: 0.7,
});
building.roof.box("stairhead", {
  position: [3, 3, 0],
  size: [2.4, 2.1, 2.2],
  material: "concrete",
  collision: "solid",
});
building.roof.box("hvac", {
  position: [8.3, 2.6, 0],
  size: [2.2, 1.5, 1.2],
  material: "metal",
  collision: "box",
  rotation: [0, 0, 8],
});
building.roof.cylinder("tank", {
  position: [9.4, 7.2, 0],
  size: [1.8, 1.8, 2.5],
  material: "paint",
  collision: "box",
  segments: 20,
});
building.roof.beam(
  "mast",
  [6.2, 6.4, 0],
  [6.2, 6.4, 4.2],
  0.14,
  "metal",
);
building.roof.beam(
  "mast-arm",
  [6.2, 6.4, 3.6],
  [7.8, 6.4, 3.6],
  0.1,
  "metal",
);
scene.document.markers.push({
  id: "spawn",
  kind: "attacker_spawn",
  layer: building.group.layer.id,
  region: "district/main/roof-deck",
  position: building.roof.world([1.2, 1.2, 0]),
});

const landmarks: Record<string, V3> = {
  "roof-sw": building.roof.world([0, 0, 0]),
  "roof-ne": building.roof.world([12, 10, 0]),
  "stairhead-top": building.roof.world([3, 3, 2.2]),
  "tank-top": building.roof.world([9.4, 7.2, 2.5]),
  "mast-tip": building.roof.world([6.2, 6.4, 4.2]),
};
function reference(
  id: string,
  image: string,
  position: V3,
  target: V3,
  fov: number,
): ReferenceView {
  const view: ReferenceView = {
    id,
    label: id[0].toUpperCase() + id.slice(1),
    image,
    width: WIDTH,
    height: HEIGHT,
    scale: "measured",
    scaleNote: "Synthetic acceptance fixture authored directly in metres.",
    camera: {
      position,
      target,
      up: [0, 0, 1],
      fov,
      near: 0.05,
      far: 200,
    },
    landmarks: [],
    masks: [],
  };
  view.landmarks = Object.entries(landmarks).map(([name, point]) => {
    const imagePoint = projectReference(view, point).image;
    if (!imagePoint)
      throw new Error(`${id}: landmark ${name} lies behind the saved camera.`);
    return { id: `${id}-${name}`, position: point, image: imagePoint };
  });
  return view;
}
scene.document.references = [
  reference("oblique", "rooftop-oblique.png", [22, -25, 18], [0, 0, 7.5], 46),
  reference("south", "rooftop-south.png", [0, -31, 10.5], [0, 0, 7.2], 43),
  reference("east", "rooftop-east.png", [30, 0, 12.5], [0, 0, 7.6], 43),
];

const level = await compile(scene.document, {
    floorGaps: "error",
    surfaceContacts: "error",
  }),
  report = await validateForRuntime(level, { sealed: true });
if (!report.passed)
  throw new Error(JSON.stringify(report.diagnostics, null, 2));
await mkdir("reference/rooftop", { recursive: true });
await writeFile(
  "examples/rooftop-reference.level.svgx",
  serializeLevelSvgx(scene.document),
);
for (const view of scene.document.references) {
  const rendered = renderReference(level, view);
  const png = new PNG({ width: rendered.width, height: rendered.height });
  png.data.set(rendered.rgba);
  await writeFile(
    `reference/rooftop/${view.image}`,
    PNG.sync.write(png),
  );
}
await writeFile(
  "reference/rooftop/acceptance.json",
  JSON.stringify(
    {
      version: 1,
      source: "examples/rooftop-reference.level.svgx",
      width: WIDTH,
      height: HEIGHT,
      views: scene.document.references.map((view) => ({
        id: view.id,
        image: view.image,
        landmarks: view.landmarks.length,
      })),
      stats: level.stats,
      validationPassed: report.passed,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify(
    {
      source: "examples/rooftop-reference.level.svgx",
      views: scene.document.references.map((view) => view.id),
      stats: level.stats,
      validationPassed: report.passed,
    },
    null,
    2,
  ),
);
