import { SceneBuilder } from "../../src/vector/index.ts";

/** An 8 × 6 m deck bisected by a 0.30 m wall with a centered 0.70 m opening. */
export function navigationDoorway(clearWidth = 0.7, lowHeadroom = false) {
  const scene = new SceneBuilder("navigation-doorway");
  scene.document.validation = "premap";
  scene.document.player.radius = 0.25;
  scene.document.player.height = 1.8;
  const group = scene.group("ground");
  group.platform("deck", { width: 8, depth: 6, material: "default" });
  const jambLength = (6 - clearWidth) / 2;
  group.box("south-jamb", { position: [4, jambLength / 2, 0],
    size: [0.3, jambLength, 3], material: "default", collision: "solid" });
  group.box("north-jamb", { position: [4, 6 - jambLength / 2, 0],
    size: [0.3, jambLength, 3], material: "default", collision: "solid" });
  if (lowHeadroom) group.box("low-lintel", { position: [4, 3, 1.2],
    size: [0.3, clearWidth, 0.3], material: "default", collision: "solid" });
  return scene.document;
}
