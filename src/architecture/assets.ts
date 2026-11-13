import type { ArchitectureDocument, ArchitectureElement } from "./types.ts";
import { materialCompanions } from "../vector/materials.ts";

/** Lists declared local companions without loading files or including native physical proxies. */
export function architectureCompanions(document: ArchitectureDocument): string[] {
  const references = new Set<string>();
  const visit = (element: ArchitectureElement) => {
    if (element.kind === "visual-mesh") references.add(element.src);
    if (element.kind === "terrain" && element.heightmap) references.add(element.heightmap);
    if ("children" in element) element.children.forEach(visit);
  };
  document.elements.forEach(visit); for (const definition of document.definitions) definition.children.forEach(visit);
  for (const material of document.materials) for (const reference of materialCompanions(material)) references.add(reference);
  for (const reference of document.references) references.add(reference.image);
  return [...references];
}

/** Lists heightmap companions so hosts can enforce byte bounds before reading them. */
export function heightmapCompanions(document: ArchitectureDocument): Set<string> {
  const result = new Set<string>();
  const visit = (element: ArchitectureElement) => {
    if (element.kind === 'terrain' && element.heightmap) result.add(element.heightmap);
    if ('children' in element) element.children.forEach(visit);
  };
  document.elements.forEach(visit);
  for (const definition of document.definitions) definition.children.forEach(visit);
  return result;
}
