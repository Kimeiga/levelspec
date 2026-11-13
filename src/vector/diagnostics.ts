import { spatialBounds } from "./spatial-geometry.ts";
import type { CompiledLevel, Diagnostic, SourceLocation, V3 } from "./types.ts";

/** Resolves current source offsets without caching them with geometric evidence. */
export function diagnosticSource(level: CompiledLevel, id: string): SourceLocation | undefined {
  return level.provenance?.[id]?.source ?? [
    ...(level.connections ?? []),
    ...level.document.markers,
    ...level.document.routes,
    ...level.document.links,
    ...level.document.layers.flatMap(layer => [...layer.regions, ...layer.edges, ...layer.vertices]),
  ].find(object => object.id === id)?.source;
}

/** Formats a source-linked finding while retaining every implicated object's location. */
export function sourceDiagnostic(
  level: CompiledLevel,
  code: string,
  message: string,
  objects: string[] = [],
  severity: Diagnostic["severity"] = "error",
): Diagnostic {
  const relatedSources = [...new Set(objects)].map(object => ({ object, source: diagnosticSource(level, object) }));
  const areaSource = level.floors.find(floor => objects.includes(floor.area ?? floor.region))?.region;
  return {
    severity, code, message, objects: relatedSources.map(entry => entry.object), relatedSources,
    source: relatedSources.find(entry => entry.source)?.source ?? (areaSource ? diagnosticSource(level, areaSource) : undefined),
  };
}

/** Adds a finite world-space inspection target without altering physical geometry. */
export function spatialDiagnostic(
  level: CompiledLevel,
  code: string,
  message: string,
  objects: string[],
  points: V3[],
  severity: Diagnostic["severity"] = "warning",
  direction: V3 = [1, -1, 0.5],
): Diagnostic {
  const diagnostic = sourceDiagnostic(level, code, message, objects, severity);
  if (!points.length) return diagnostic;
  const bounds = spatialBounds(points);
  diagnostic.review = {
    id: `${code}:${objects.join("|")}`,
    layers: [...new Set(level.surfaces.filter(surface => objects.includes(surface.object)).map(surface => surface.layer))],
    bounds,
    position: bounds.min.map((value, axis) => (value + bounds.max[axis]) / 2) as V3,
    direction,
    patches: [],
  };
  return diagnostic;
}

/** Projects active review evidence into ordinary warnings; acknowledgments remain geometry-specific. */
export function refreshSuggestionDiagnostics(level: CompiledLevel): void {
  const retained = level.diagnostics.filter(diagnostic => !diagnostic.suggestion);
  const warnings: Diagnostic[] = level.suggestions.filter(finding => finding.state === "active").map(finding => ({
    ...sourceDiagnostic(level, finding.code, finding.message, finding.objects, "warning"),
    suggestion: { id: finding.id, fingerprint: finding.fingerprint },
    review: {
      id: finding.id, layers: [...finding.layers], bounds: structuredClone(finding.bounds),
      position: [...finding.position], direction: [...finding.direction], patches: [],
      ...(finding.navigation ? { navigation: { ...finding.navigation } } : {}),
    },
  }));
  level.diagnostics.splice(0, level.diagnostics.length, ...retained, ...warnings);
}
