import * as THREE from "three";
/** A fixed, local sky-light environment. No frame-varying noise or remote HDR download. */
export function makeEnvironment(
  renderer: THREE.WebGLRenderer,
  sky: string,
  ground: string,
) {
  const width = 128,
    height = 64,
    data = new Float32Array(width * height * 4);
  const top = new THREE.Color(sky),
    bottom = new THREE.Color(ground),
    c = new THREE.Color();
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const latitude = y / (height - 1),
        blend = THREE.MathUtils.smoothstep(latitude, 0.42, 0.82);
      c.copy(top).lerp(bottom, blend).multiplyScalar(0.65);
      const highlight =
        Math.exp(
          -((x / width - 0.28) ** 2 / 0.008 + (latitude - 0.31) ** 2 / 0.025),
        ) * 0.85;
      const i = (y * width + x) * 4;
      data[i] = c.r + highlight;
      data[i + 1] = c.g + highlight * 0.94;
      data[i + 2] = c.b + highlight * 0.84;
      data[i + 3] = 1;
    }
  const image = new THREE.DataTexture(
    data,
    width,
    height,
    THREE.RGBAFormat,
    THREE.FloatType,
  );
  image.mapping = THREE.EquirectangularReflectionMapping;
  image.needsUpdate = true;
  const generator = new THREE.PMREMGenerator(renderer);
  const target = generator.fromEquirectangular(image);
  image.dispose();
  generator.dispose();
  return target;
}
