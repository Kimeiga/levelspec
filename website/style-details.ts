import type { V3 } from "../src/vector/types.ts";
import type { WorldStyle } from "./world-styles.ts";
type Box = (id: string, min: V3, max: V3, material?: string) => void;
type Beam = (
  id: string,
  a: V3,
  b: V3,
  width: number,
  height: number,
  material: string,
  control?: string,
) => void;
/** Each style adds real source geometry, with distinct silhouette and detail language. */
export function addStyleDetails(
  style: WorldStyle,
  h: number,
  box: Box,
  beam: Beam,
) {
  const roof = h + 3.6;
  if (style === "clay") {
    // A cedar belvedere marks the library destination; it is roof scenery, not a new playable floor.
    const base = h + 4.7;
    for (const [i, x, y] of [
      [0, -5.2, 19.1],
      [1, -1.4, 19.1],
      [2, -5.2, 22.9],
      [3, -1.4, 22.9],
    ])
      box(
        `clay.belvedere.column.${i}`,
        [x, y, base],
        [x + 0.22, y + 0.22, base + 2.5],
        "wood",
      );
    box(
      "clay.belvedere.crown",
      [-5.5, 18.8, base + 2.5],
      [-0.9, 23.4, base + 2.72],
      "wood",
    );
    for (let i = 0; i < 10; i++)
      box(
        `clay.belvedere.screen.${i}`,
        [-5.2, 19.45 + i * 0.33, base + 0.35],
        [-5.08, 19.51 + i * 0.33, base + 2.42],
        "wood",
      );
    for (let i = 0; i < 10; i++)
      beam(
        `clay.pergola.${i}`,
        [0.7 + i * 0.72, 9.16, h + 2.62],
        [0.7 + i * 0.72, 11.35, h + 2.62],
        0.14,
        0.16,
        "wood",
      );
    for (const x of [0.7, 4.1, 7.2]) {
      box(
        `clay.canopy.post.${x}`,
        [x, 9.4, h + 0.87],
        [x + 0.14, 9.57, h + 2.62],
        "wood",
      );
    }
    for (let i = 0; i < 4; i++) {
      const x = 1.2 + i * 6;
      box(
        `clay.lantern.stem.${i}`,
        [x, 14.8, h - 0.45],
        [x + 0.045, 14.845, h - 0.2],
        "bronze",
      );
      box(
        `clay.lantern.body.${i}`,
        [x - 0.13, 14.63, h - 0.72],
        [x + 0.17, 14.96, h - 0.46],
        "lamp",
      );
      box(
        `clay.lantern.cap.${i}`,
        [x - 0.17, 14.59, h - 0.46],
        [x + 0.21, 15, h - 0.4],
        "bronze",
      );
    }
  }
  if (style === "chalk") {
    // Gabled ceramic roofs: sloping source edges, not a viewer-only roof mesh.
    beam(
      "chalk.west-roof.a",
      [-6.25, 6, roof + 0.17],
      [-3, 6, roof + 1.6],
      12.3,
      0.18,
      "roof",
    );
    beam(
      "chalk.west-roof.b",
      [-3, 6, roof + 1.6],
      [0.25, 6, roof + 0.17],
      12.3,
      0.18,
      "roof",
    );
    beam(
      "chalk.east-roof.a",
      [22.75, 6, roof + 0.17],
      [26, 6, roof + 1.6],
      12.3,
      0.18,
      "roof",
    );
    beam(
      "chalk.east-roof.b",
      [26, 6, roof + 1.6],
      [29.25, 6, roof + 0.17],
      12.3,
      0.18,
      "roof",
    );
    box("chalk.garden.soil", [5.21, 4.21, 0.14], [7.79, 6.79, 0.21], "wood");
    box("chalk.garden.trunk", [6.3, 5.32, 0.21], [6.5, 5.54, 2.65], "wood");
    // Rounded canopy clusters are curved source wall solids, not imported scenery.
    for (const [i, x, y, z, r] of [
      [0, 6.2, 5.45, 2.1, 0.37],
      [1, 6.75, 5.67, 2.4, 0.36],
      [2, 6.34, 5.93, 1.9, 0.32],
    ]) {
      const pts: V3[] = [
        [x + r, y, z],
        [x, y + r, z],
        [x - r, y, z],
        [x, y - r, z],
      ];
      const corners = [
        [x + r, y + r],
        [x - r, y + r],
        [x - r, y - r],
        [x + r, y - r],
      ];
      for (let j = 0; j < 4; j++)
        beam(
          `chalk.canopy.${i}.${j}`,
          pts[j],
          pts[(j + 1) % 4],
          r * 1.6,
          0.65,
          "foliage",
          corners[j].join(" "),
        );
    }
    for (let i = 0; i < 8; i++) {
      const x = 0.63 + i * 2.7;
      box(
        `chalk.bridge.baluster.${i}`,
        [x, 9.42, h + 0.87],
        [x + 0.13, 9.55, h + 1.15],
        "tile",
      );
    }
  }
  if (style === "night") {
    // Sawtooth roof monitors and a steel portal distinguish the atelier's silhouette.
    for (let i = 0; i < 4; i++) {
      const x = 23.3 + i * 1.45;
      beam(
        `night.monitor.rise.${i}`,
        [x, 6, roof + 0.2],
        [x + 1.0, 6, roof + 1.35],
        11.5,
        0.14,
        "bronze",
      );
      beam(
        `night.monitor.back.${i}`,
        [x + 1.0, 6, roof + 1.35],
        [x + 1.32, 6, roof + 0.2],
        11.5,
        0.1,
        "wood",
      );
    }
    box(
      "night.portal.left",
      [0.6, 9.39, h + 0.87],
      [0.82, 9.55, h + 3.05],
      "bronze",
    );
    box(
      "night.portal.right",
      [0.6, 10.96, h + 0.87],
      [0.82, 11.12, h + 3.05],
      "bronze",
    );
    box(
      "night.portal.top",
      [0.56, 9.35, h + 3.05],
      [0.86, 11.16, h + 3.23],
      "bronze",
    );
    box("night.sculpture.a", [5.48, 4.9, 0.14], [5.7, 6.18, 2.7], "teal");
    box("night.sculpture.b", [5.7, 4.9, 2.48], [7.24, 5.15, 2.7], "teal");
    box("night.sculpture.c", [7.02, 5.15, 0.72], [7.24, 6.18, 2.48], "teal");
    box("night.sculpture.d", [5.7, 5.93, 0.5], [7.24, 6.18, 0.72], "teal");
  }
}
