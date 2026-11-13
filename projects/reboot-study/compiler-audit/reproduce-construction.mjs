/** Records compiler behavior for reduced reboot cases without changing map sources. */
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { compile, parseAml, collisionMesh, validateForRuntime } from 'levelspec';
import { produceDocument } from 'levelspec/producers';
import { Ray, Vector3 } from 'three';

const output = resolve(process.argv[2] ?? 'generated/reboot-compiler-audit/construction');
await mkdir(output, { recursive: true });

/** Tests an optical segment against exported physical triangles, independent of navigation. */
function segmentBlocked(level, start, end) {
  const origin = new Vector3(...start), destination = new Vector3(...end);
  const distance = origin.distanceTo(destination);
  const ray = new Ray(origin, destination.sub(origin).normalize());
  const mesh = collisionMesh(level);
  for (let index = 0; index < mesh.indices.length; index += 3) {
    const vertices = mesh.indices.slice(index, index + 3)
      .map(vertex => new Vector3(...mesh.positions.slice(vertex * 3, vertex * 3 + 3)));
    const hit = ray.intersectTriangle(...vertices, false, new Vector3());
    if (hit && hit.distanceTo(origin) < distance - 1e-6) return true;
  }
  return false;
}

/** Reads one source object's final surface heights rather than its authoring parameters. */
function objectHeightRange(level, id) {
  const mesh = collisionMesh(level), heights = [];
  mesh.surfaces.forEach((surface, triangle) => {
    if (level.surfaces[surface].object !== id) return;
    for (const index of mesh.indices.slice(triangle * 3, triangle * 3 + 3))
      heights.push(mesh.positions[index * 3 + 2]);
  });
  return heights.length ? [Math.min(...heights), Math.max(...heights)] : undefined;
}

/** Saves each exact source and records observations; this audit does not bless current failures as contracts. */
async function observe(id, body, options = {}, inspect = () => ({})) {
  const source = `<architecture version="1" id="${id}" validation="playable">\n${body}\n</architecture>`;
  await writeFile(resolve(output, `${id}.aml`), source);
  const document = parseAml(source);
  const level = await compile(document, options);
  const observation = { id, diagnostics: level.diagnostics, suggestions: level.suggestions.map(s => s.code), ...inspect(level) };
  if (options.navigation !== false) {
    const report = await validateForRuntime(level, { sealed: true, cell: .125 });
    observation.validationPassed = report.passed;
    observation.routes = report.navigation?.routes;
    observation.sealedRoutes = report.sealed?.routes;
    observation.uncovered = report.navigation?.coverage.uncovered;
    try {
      const made = await produceDocument(document);
      observation.producer = { passed: true, physicalRoutes: made.physical.routes };
    } catch (error) {
      observation.producer = { passed: false, message: error.message, diagnostics: error.diagnostics };
    }
  }
  return observation;
}

const common = `
  <player radius="0.25" height="2" step="0.25" slope="42"/>
  <profile id="left-plan" points="0 0; 5 0; 5 8; 0 8"/>
  <profile id="right-plan" points="5 0; 10 0; 10 8; 5 8"/>
  <slab id="left" profile="left-plan"/><slab id="right" profile="right-plan"/>
  <box id="divider" width="0.2" depth="6" height="3" position="4.9 0 0"/>
  <path id="blocked-mouth" points="5 1 0; 5 3 0"/>
  <path id="open-mouth" points="5 6 0; 5 8 0"/>
  <connection id="blocked-link" from="left" to="right" path="blocked-mouth"/>
  <connection id="open-link" from="left" to="right" path="open-mouth"/>
  <marker id="start" kind="spawn" element="left" position="2 2 0"/>
  <marker id="end" kind="objective" element="right" position="8 2 0"/>`;
const observations = [];
observations.push(await observe('blocked-mouth-alternate-route', common +
  '<route id="crossing" from="start" to="end" min-routes="2" max-distance="30"/>',
  { navigation: { cell: .125 } }, level => ({
    blockedMouthSegmentBlocked: segmentBlocked(level, [4, 2, 1], [6, 2, 1]),
    openMouthSegmentBlocked: segmentBlocked(level, [4, 7, 1], [6, 7, 1]),
  })));

const room = `
  <profile id="plan" points="0 0; 10 0; 10 6; 0 6"/>
  <path id="wall-axis" points="1 3 0; 9 3 0"/>
  <slab id="floor" profile="plan" thickness="0.24"/>
  <roof id="roof" profile="plan" elevation="6.9" thickness="0.25" playable="false"/>`;
for (const [id, attributes] of [
  ['literal-tall-wall', 'height="9.5"'],
  ['roof-anchored-wall', 'base-floor="floor" top-floor="roof" span-floors="true"'],
]) {
  observations.push(await observe(id, room + `<wall id="wall" path="wall-axis" thickness="0.3" ${attributes}/>`,
    { navigation: false }, level => ({ wallHeightRange: objectHeightRange(level, 'wall') })));
}

const passage = `
  <profile id="plan" points="0 0; 6 0; 6 6; 0 6"/>
  <profile id="passage-plan" points="1 2; 5 2; 5 4; 1 4"/>
  <slab id="floor" profile="plan"/>
  <box id="lintel" width="0.3" depth="2" height="0.4" position="2.85 2 1.8"/>`;
observations.push(await observe('lintel-clearance', passage +
  '<clearance id="required-passage" profile="passage-plan" height="2" require-support="true"/>',
  { navigation: false }));

const roofStep = `
  <profile id="ground-plan" points="0 0; 10 0; 10 6; 0 6"/>
  <profile id="low-plan" points="0 0; 5 0; 5 6; 0 6"/>
  <profile id="high-plan" points="5 0; 10 0; 10 6; 5 6"/>
  <slab id="floor" profile="ground-plan"/>
  <roof id="low" profile="low-plan" elevation="3" thickness="0.25" playable="false"/>
  <roof id="high" profile="high-plan" elevation="6" thickness="0.25" playable="false"/>`;
observations.push(await observe('unclosed-roof-step', roofStep, { navigation: false }, level => ({
  stepClosureSegmentBlocked: segmentBlocked(level, [4, 3, 4], [6, 3, 4]),
})));
observations.push(await observe('anchored-roof-step', roofStep + `
  <path id="step-axis" points="5 0.5 0; 5 5.5 0"/>
  <wall id="fascia" path="step-axis" thickness="0.3" base-floor="low" top-floor="high" span-floors="true"/>`,
  { navigation: false }, level => ({
    fasciaHeightRange: objectHeightRange(level, 'fascia'),
    stepClosureSegmentBlocked: segmentBlocked(level, [4, 3, 4], [6, 3, 4]),
  })));
await writeFile(resolve(output, 'observations.json'), JSON.stringify(observations, null, 2) + '\n');
console.log(JSON.stringify(observations, null, 2));
