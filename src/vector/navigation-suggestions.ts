import type {
  CompiledLevel,
  NavigationReport,
  Suggestion,
  V3,
} from "./types.ts";
import { hash } from "./geometry.ts";
import { aborted } from "./types.ts";

/** Refreshes land review findings after a completed unsealed bake, without altering validation. */
export async function refreshNavigationSuggestions(
  level: CompiledLevel,
  navigation: NavigationReport,
  signal?: AbortSignal,
): Promise<void> {
  const components = [...navigation.componentDetails].sort(
    (a, b) => b.area - a.area || a.id.localeCompare(b.id),
  );
  const main = components[0];
  const objects = new Map(
    level.document.layers.flatMap((l) => l.regions).map((r) => [r.id, r]),
  );
  const findings: Suggestion[] = [];
  /** Includes nearby source solids so sub-voxel geometry edits invalidate review decisions. */
  function localGeometry(bounds: { min: V3; max: V3 }) {
    return level.mesh.surfaces
      .flatMap((_, t) => {
        const points = level.mesh.indices
          .slice(t * 3, t * 3 + 3)
          .map((i) => level.mesh.positions.slice(i * 3, i * 3 + 3));
        if (
          [0, 1, 2].some(
            (axis) =>
              Math.max(...points.map((p) => p[axis])) <
                bounds.min[axis] - level.document.player.radius ||
              Math.min(...points.map((p) => p[axis])) >
                bounds.max[axis] + level.document.player.height,
          )
        )
          return [];
        return [
          points
            .map((p) => p.map((v) => Math.round(v * 100000) / 100000).join(","))
            .sort()
            .join(";"),
        ];
      })
      .sort();
  }
  /** Creates a finding bound to its source identity and relevant baked geometry. */
  async function emit(
    code: "NAV_ISLAND" | "FLIGHT_NAV_MISSING",
    key: string,
    regions: string[],
    layers: string[],
    bounds: { min: V3; max: V3 },
    position: V3,
    evidence: Suggestion["evidence"],
    message: string,
    dependency: unknown,
    component?: string,
  ) {
    aborted(signal);
    const id = `${code}:${key}`;
    const fingerprint = await hash({
      revision: 1,
      dependency,
      player: level.document.player,
      cell: navigation.settings.cell,
      cellHeight: navigation.settings.cellHeight,
    });
    const suppression = level.document.reviewSuppressions?.find(
      (s) => s.suggestion === id,
    );
    findings.push({
      id,
      code,
      objects: regions,
      layers,
      bounds,
      position,
      direction: [1, -1, 0],
      sources: regions.map((object) => ({
        object,
        source: objects.get(object)?.source,
      })),
      evidence,
      message,
      fingerprint,
      state: suppression?.fingerprint === fingerprint ? "suppressed" : "active",
      ...(suppression
        ? {
            suppression: {
              reason: suppression.reason,
              stale: suppression.fingerprint !== fingerprint,
            },
          }
        : {}),
      ...(component ? { navigation: { component } } : {}),
    });
  }
  for (const component of components) {
    aborted(signal);
    const small = component.area < 2 - 1e-8,
      disconnected = component.id !== main?.id;
    if (!small && !disconnected) continue;
    const triangles = navigation.triangleComponents
      .flatMap((id, t) =>
        id === component.id
          ? [
              navigation.indices
                .slice(t * 3, t * 3 + 3)
                .map((i) =>
                  navigation.positions
                    .slice(i * 3, i * 3 + 3)
                    .map((v) => Math.round(v * 100000) / 100000),
                )
                .sort()
                .map((p) => p.join(","))
                .join(";"),
            ]
          : [],
      )
      .sort();
    await emit(
      "NAV_ISLAND",
      component.id,
      component.regions,
      component.layers,
      component.bounds,
      component.position,
      { length: 0, area: component.area, small, disconnected },
      `This walking navigation patch (${component.area.toFixed(2)} m²) is ${[small ? "unusually small" : "", disconnected ? "disconnected from the largest network" : ""].filter(Boolean).join(" and ")}. Did you mean to connect ${component.regions.join(", ") || "this patch"} to a corridor or path?`,
      {
        triangles,
        disconnected,
        regions: component.regions,
        geometry: localGeometry(component.bounds),
        links: level.document.links
          .filter((link) =>
            [link.from, link.to].some((p) =>
              p.every(
                (v, i) =>
                  v >= component.bounds.min[i] - 1 &&
                  v <= component.bounds.max[i] + 1,
              ),
            ),
          )
          .map(({ id, from, to, kind, bidirectional, ability }) => ({
            id,
            from,
            to,
            kind,
            bidirectional,
            ability,
          })),
      },
      component.id,
    );
  }
  for (const layer of level.document.layers)
    for (const region of layer.regions) {
      if (region.fill !== "stairs" && region.fill !== "ramp") continue;
      const coverage = navigation.coverage.regions.find(
        (row) => row.region === region.id,
      );
      if (
        !coverage ||
        coverage.covered + (coverage.reasons.disconnected ?? 0) > 0
      )
        continue;
      const floor = level.floors.find((f) => f.region === region.id);
      if (!floor?.points.length) continue;
      const min = [0, 1, 2].map((axis) =>
        Math.min(...floor.points.map((p) => p[axis])),
      ) as V3;
      const max = [0, 1, 2].map((axis) =>
        Math.max(...floor.points.map((p) => p[axis])),
      ) as V3;
      const position = min.map((v, i) => (v + max[i]) / 2) as V3;
      await emit(
        "FLIGHT_NAV_MISSING",
        region.id,
        [region.id],
        [layer.id],
        { min, max },
        position,
        { length: 0, area: 0 },
        `${region.id} has no usable walking navigation coverage. Did you mean to connect this ${region.fill} to a corridor or path? Review clearance, slope and landing connections (${Object.keys(coverage.reasons).join(", ") || "no surviving coverage"}).`,
        {
          points: floor.points,
          reasons: coverage.reasons,
          nearby: level.mesh.surfaces
            .flatMap((_, t) => {
              const points = level.mesh.indices
                .slice(t * 3, t * 3 + 3)
                .map((i) => level.mesh.positions.slice(i * 3, i * 3 + 3));
              return [0, 1, 2].some(
                (axis) =>
                  Math.max(...points.map((p) => p[axis])) <
                    min[axis] - level.document.player.radius ||
                  Math.min(...points.map((p) => p[axis])) >
                    max[axis] + level.document.player.height,
              )
                ? []
                : [
                    points
                      .map((p) =>
                        p.map((v) => Math.round(v * 100000) / 100000).join(","),
                      )
                      .sort()
                      .join(";"),
                  ];
            })
            .sort(),
          settings: navigation.settings.sampleSpacing,
        },
      );
    }
  level.suggestions = [
    ...level.suggestions.filter(
      (s) => s.code !== "NAV_ISLAND" && s.code !== "FLIGHT_NAV_MISSING",
    ),
    ...findings,
  ].sort((a, b) => a.id.localeCompare(b.id));
  level.navigationSuggestionsStatus = "complete";
}
