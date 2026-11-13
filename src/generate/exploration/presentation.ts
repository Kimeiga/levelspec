import { routePoints } from "./metrics.ts";
import type { ExplorationConfig, Graph, Point, Realization } from "./types.ts";

/** Escapes labels crossing the XML/HTML boundary. */
export function escapeMarkup(value: string): string {
  return value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Draws an inspectable graph, realized plan, or longitudinal height diagram from the same domain data. */
export function diagram(graph: Graph, config: ExplorationConfig, realization?: Realization, section = false): string {
  const project = (p: Point) => [p[0], section ? 10 - p[2] * 2 : -p[1]];
  const extent = [...graph.nodes.flatMap(n => [[n.position[0] - n.radius, n.position[1] - n.radius, n.position[2]],
    [n.position[0] + n.radius, n.position[1] + n.radius, n.position[2]]] as Point[]), ...graph.edges.flatMap(edge => routePoints(graph, edge)), ...(realization?.surfaces.flatMap(s => s.points) ?? [])].map(project);
  const left = Math.min(...extent.map(p => p[0])) - 10, top = Math.min(...extent.map(p => p[1])) - 12;
  const width = Math.max(30, Math.max(...extent.map(p => p[0])) - left + 10), height = Math.max(30, Math.max(...extent.map(p => p[1])) - top + 10);
  const points = (list: Point[]) => list.map(p => project(p).join(",")).join(" ");
  const lines: string[] = [];
  const regionIds = [...new Set(graph.nodes.flatMap(n => n.region ? [n.region] : []))].sort();
  const palette = ["#7fcbbb", "#c4a4e8", "#e4ba73", "#7bafdf", "#d69fba", "#aaca82"];
  const regionColor = (id: string) => palette[regionIds.indexOf(id) % palette.length];
  if (!realization && !section) for (const id of regionIds) {
    const members = graph.nodes.filter(n => n.region === id).map(n => project(n.position));
    const x = Math.min(...members.map(p => p[0])) - 4, y = Math.min(...members.map(p => p[1])) - 5;
    const w = Math.max(...members.map(p => p[0])) - x + 4, h = Math.max(...members.map(p => p[1])) - y + 4;
    lines.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${regionColor(id)}" fill-opacity=".06" stroke="${regionColor(id)}" stroke-opacity=".5" stroke-width=".3" stroke-dasharray="1 1"/>`);
  }
  if (realization) for (const surface of [...realization.surfaces].sort((a, b) => a.points[0][2] - b.points[0][2])) {
    const fill = surface.kind === "hall" ? "#293d43" : surface.kind === "area" ? "#426068" : "#718788";
    lines.push(`<polygon points="${points(surface.points)}" fill="${fill}" stroke="#b2c0b5" stroke-width=".15" opacity=".9"/>`);
  }
  for (const edge of graph.edges) {
    const route = routePoints(graph, edge);
    lines.push(`<polyline data-edge="${escapeMarkup(edge.id)}" data-cross-level="${edge.crossLevel === true}" points="${points(route)}" fill="none" stroke="${edge.locked ? "#f1ba6a" : edge.crossLevel ? "#e4a3dd" : "#91ada7"}" stroke-width="${realization ? .22 : .6}" ${edge.bidirectional ? "" : 'marker-end="url(#arrow)"'} ${["jump", "ladder", "drop"].includes(edge.mode) ? 'stroke-dasharray="1 1"' : ""}/>`);
    if (!realization) {
      const p = project(route[Math.floor(route.length / 2)]);
      lines.push(`<text x="${p[0]}" y="${p[1] - 1}" font-size="1.45" fill="${edge.crossLevel ? "#e4a3dd" : "#9ab3ba"}">${escapeMarkup(edge.mode)}${edge.crossLevel ? " · cross-level" : ""}</text>`);
    }
  }
  for (const node of graph.nodes) {
    const p = project(node.position), color = node.role === "entry" ? "#9ce0b0" : node.role === "key" ? "#ffbc72" : node.region ? regionColor(node.region) : "#c4d4dc";
    const label = node.id.replace(/^stage-/, "").replace(/^node-/, "n");
    lines.push(`<g data-node="${escapeMarkup(node.id)}" tabindex="0" role="button" aria-label="Edit ${escapeMarkup(node.id)}"><title>${escapeMarkup(node.id)}${node.region ? ` / ${escapeMarkup(node.region)}` : ""}</title><circle cx="${p[0]}" cy="${p[1]}" r="${realization ? 1 : Math.max(2, node.radius * .45)}" fill="${color}" stroke="${node.pinned ? "#ffcf72" : "#17262c"}" stroke-width="${node.pinned ? 1 : .4}"/><text x="${p[0]}" y="${p[1] - 4}" text-anchor="middle" font-size="${graph.nodes.length > 14 ? 1.6 : 2.2}" fill="#e5efea">${escapeMarkup(label)} · ${node.position[2]}m${node.pinned ? " ▣" : ""}</text></g>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${left} ${top} ${width} ${height}" role="img" aria-label="${section ? "Height diagram" : realization ? "Spatial plan" : "Editable mobility graph"}"><defs><marker id="arrow" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5" fill="#91ada7"/></marker></defs><rect x="${left}" y="${top}" width="${width}" height="${height}" fill="#15242a"/>${lines.join("")}</svg>`;
}
