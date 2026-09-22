import * as THREE from "three";
/** Fit all eight corners, respecting the real viewport aspect ratio. */
export function overviewFrame(
  model: THREE.Object3D,
  camera: THREE.PerspectiveCamera,
) {
  const box = new THREE.Box3().setFromObject(model);
  if (box.isEmpty())
    box.set(new THREE.Vector3(0, -4.5, 0), new THREE.Vector3(27, 12, 7));
  const target = box.getCenter(new THREE.Vector3());
  const back = new THREE.Vector3(25, -30, 24).normalize();
  const right = new THREE.Vector3(0, 0, 1).cross(back).normalize();
  const up = back.clone().cross(right).normalize();
  const tanV = Math.tan((camera.fov * Math.PI) / 360) * 0.78;
  const tanH = tanV * camera.aspect;
  let distance = 5;
  for (const x of [box.min.x, box.max.x]) {
    for (const y of [box.min.y, box.max.y]) {
      for (const z of [box.min.z, box.max.z]) {
        const p = new THREE.Vector3(x, y, z).sub(target);
        distance = Math.max(
          distance,
          Math.abs(p.dot(right)) / tanH + p.dot(back),
          Math.abs(p.dot(up)) / tanV + p.dot(back),
        );
      }
    }
  }
  return { position: target.clone().addScaledVector(back, distance), target };
}
