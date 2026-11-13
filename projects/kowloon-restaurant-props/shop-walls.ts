import { BoxGeometry, BufferAttribute, Group, Mesh, type Texture } from "three";
import { concreteMaterial } from "../../src/materials/concrete/material.ts";

/** Reuses the live concrete study on Z-up shop walls at its authored two-meter image scale. */
export function shopWalls(width: number, depth: number, height: number, textures: [Texture, Texture, Texture]): Group {
  const group = new Group();
  const finish = concreteMaterial(...textures);
  finish.setHoles(false);
  const boxes = [
    { size: [width + .16, .08, height], center: [width / 2, depth + .04, height / 2] },
    { size: [.08, depth, height], center: [-.04, depth / 2, height / 2] },
    { size: [.08, depth, height], center: [width + .04, depth / 2, height / 2] },
  ];
  for (const { size, center } of boxes) {
    const geometry = new BoxGeometry(size[0], size[1], size[2]);
    const positions = geometry.getAttribute("position"), normals = geometry.getAttribute("normal"), uv = geometry.getAttribute("uv");
    const halfSizes = new Float32Array(positions.count * 2), topDistances = new Float32Array(positions.count);
    for (let i = 0; i < positions.count; i++) {
      const side = Math.abs(normals.getX(i)) > .5, top = Math.abs(normals.getZ(i)) > .5;
      const u = side ? positions.getY(i) : positions.getX(i);
      const v = top ? positions.getY(i) : positions.getZ(i);
      uv.setXY(i, u / 2, v / 2);
      halfSizes[i * 2] = (side ? size[1] : size[0]) / 2;
      halfSizes[i * 2 + 1] = (top ? size[1] : size[2]) / 2;
      topDistances[i] = size[2] / 2 - positions.getZ(i);
    }
    geometry.setAttribute("concreteFaceHalfSize", new BufferAttribute(halfSizes, 2));
    geometry.setAttribute("concreteTopDistance", new BufferAttribute(topDistances, 1));
    const wall = new Mesh(geometry, finish.material);
    wall.position.set(center[0], center[1], center[2]);
    wall.castShadow = true; wall.receiveShadow = true;
    group.add(wall);
  }
  return group;
}
