import type { CompiledLevel } from "../src/vector/types.ts";

/** Renders source provenance and authored profile sketches beside the final scene. */
export function renderArchitectureInspection(container: HTMLElement, level: CompiledLevel | undefined, id: string): void {
  container.replaceChildren();
  const provenance = level?.provenance?.[id];
  container.hidden = !provenance;
  if (!level || !provenance) return;
  const heading = document.createElement("summary"); heading.textContent = "Architecture and source profiles"; container.append(heading);
  const describe = (label: string, value: string | undefined) => {
    if (!value) return;
    const paragraph = document.createElement("p"); paragraph.textContent = `${label}: ${value}`; container.append(paragraph);
  };
  describe("Object", id);
  describe("Source", provenance.source ? `line ${provenance.source.line}, column ${provenance.source.column}` : undefined);
  describe("Host", provenance.host); describe("Assemblies", provenance.assemblies?.join(" → ") ?? provenance.assembly);
  describe("Instances", provenance.instances?.join(", "));
  describe("Contributors", provenance.contributors?.join(", "));
  const volume = level.spatialVolumes?.find(volume => volume.id === id);
  if (volume) {
    describe("Spatial declaration", volume.kind); describe("Role", volume.role); describe("Movement", volume.movement);
    describe("Extrusion", volume.extrusion.join(", "));
    for (const [key,value] of Object.entries(volume.properties ?? {})) describe(key,value);
  }
  const tiles = level.terrainTiles?.filter(tile => tile.terrain === id);
  if (tiles?.length) {
    describe("Terrain tiles", String(tiles.length));
    const min = [0,1,2].map(axis => Math.min(...tiles.map(tile => tile.bounds.min[axis])));
    const max = [0,1,2].map(axis => Math.max(...tiles.map(tile => tile.bounds.max[axis])));
    describe("Terrain bounds", `${min.join(", ")} → ${max.join(", ")}`);
  }
  const used = new Set(level.mesh.surfaces);
  const surfaces = level.surfaces.filter((surface, index) => used.has(index) && (surface.object === id || surface.contributors?.includes(id)));
  describe("Exposed materials", [...new Set(surfaces.map(surface => surface.material))].join(", "));
  for (const profile of level.sourceProfiles?.filter(profile => profile.object === id) ?? []) {
    const caption = document.createElement("p"); caption.textContent = profile.role; container.append(caption);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"), line = document.createElementNS(svg.namespaceURI, "polyline");
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const point of profile.points) { minX = Math.min(minX, point[0]); minY = Math.min(minY, -point[1]); maxX = Math.max(maxX, point[0]); maxY = Math.max(maxY, -point[1]); }
    const width = maxX - minX, height = maxY - minY, margin = Math.max(width, height, .1) * .08;
    svg.setAttribute("viewBox", `${minX - margin} ${minY - margin} ${width + 2 * margin} ${height + 2 * margin}`);
    svg.setAttribute("role", "img"); svg.setAttribute("aria-label", profile.role); svg.setAttribute("width", "100%"); svg.setAttribute("height", "110");
    const points = profile.closed ? [...profile.points, profile.points[0]] : profile.points;
    line.setAttribute("points", points.map(point => `${point[0]},${-point[1]}`).join(" "));
    line.setAttribute("fill", "none"); line.setAttribute("stroke", "currentColor"); line.setAttribute("stroke-width", "1.5"); line.setAttribute("vector-effect", "non-scaling-stroke");
    svg.append(line); container.append(svg);
  }
}
