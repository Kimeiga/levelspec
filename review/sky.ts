import * as THREE from "three";

/** Ninefold's late-afternoon light travel direction, converted from glTF Y-up to domain Z-up. */
export const SUN_DIRECTION = new THREE.Vector3(
  Math.cos(THREE.MathUtils.degToRad(12)) *
    Math.cos(THREE.MathUtils.degToRad(36)),
  Math.sin(THREE.MathUtils.degToRad(12)) *
    Math.cos(THREE.MathUtils.degToRad(36)),
  -Math.sin(THREE.MathUtils.degToRad(36)),
);
export const SUN_COLOR = new THREE.Color(1, 0.72, 0.46);
const SKY_STOPS: [number, [number, number, number]][] = [
  [0, [1.05, 0.66, 0.4]],
  [0.1, [0.8, 0.62, 0.56]],
  [0.34, [0.34, 0.46, 0.78]],
  [1, [0.1, 0.2, 0.52]],
];

/** Covers either projection with rays into the sky; orthographic rays are parallel. */
function createSkyBackdrop(texture: THREE.CubeTexture) {
  const material = new THREE.ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    fog: false,
    uniforms: {
      sky: { value: texture },
      projectionInverse: { value: new THREE.Matrix4() },
      cameraWorld: { value: new THREE.Matrix4() },
      orthographic: { value: false },
    },
    vertexShader: `
      varying vec2 screen;
      void main() { screen = position.xy; gl_Position = vec4(position.xy, 1.0, 1.0); }
    `,
    fragmentShader: `
      uniform samplerCube sky;
      uniform mat4 projectionInverse;
      uniform mat4 cameraWorld;
      uniform bool orthographic;
      varying vec2 screen;
      void main() {
        vec4 view = projectionInverse * vec4(screen, 1.0, 1.0);
        vec3 ray = orthographic ? vec3(0.0, 0.0, -1.0) : normalize(view.xyz / view.w);
        gl_FragColor = textureCube(sky, mat3(cameraWorld) * ray);
      }
    `,
  });
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  backdrop.frustumCulled = false;
  backdrop.renderOrder = -Infinity;
  backdrop.onBeforeRender = (_renderer, _scene, camera) => {
    material.uniforms.projectionInverse.value.copy(
      camera.projectionMatrixInverse,
    );
    material.uniforms.cameraWorld.value.copy(camera.matrixWorld);
    material.uniforms.orthographic.value =
      camera instanceof THREE.OrthographicCamera;
  };
  return backdrop;
}

/** Generates the walkthrough's sky and reflection environment on the GPU; owns no level lighting bake. */
export function createReviewSky(renderer: THREE.WebGLRenderer) {
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(700, 48, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        stops: { value: SKY_STOPS.map(([position]) => position) },
        colors: { value: SKY_STOPS.map(([, c]) => new THREE.Vector3(...c)) },
        toSun: { value: SUN_DIRECTION.clone().negate() },
        sunColor: {
          value: new THREE.Vector3(SUN_COLOR.r, SUN_COLOR.g, SUN_COLOR.b),
        },
      },
      vertexShader:
        "varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `
    uniform float stops[4]; uniform vec3 colors[4]; uniform vec3 toSun; uniform vec3 sunColor; varying vec3 vDir;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
    float fbm(vec2 p){ float a = 0.5, v = 0.0; for (int i = 0; i < 5; i++){ v += a * noise(p); p = p * 2.03 + 17.0; a *= 0.5; } return v; }
    void main(){
      vec3 d = normalize(vDir);
      vec3 c = colors[0];
      for (int i = 0; i < 3; i++) c = mix(c, colors[i + 1], smoothstep(stops[i], stops[i + 1], d.z));
      float s = max(dot(d, toSun), 0.0);
      // High, thin evening cloud: streaked along one axis, lit warm on the sun side.
      vec2 plane = d.xy / (max(d.z, 0.0) + 0.22);
      float cloud = smoothstep(0.50, 0.82, fbm(plane * vec2(0.55, 1.5) + 3.0)) * smoothstep(0.02, 0.25, d.z);
      vec3 cloudColor = mix(vec3(0.62, 0.64, 0.74), sunColor * 1.25, pow(s, 3.0) * 0.8 + 0.12);
      c = mix(c, cloudColor, cloud * 0.6);
      c += sunColor * (pow(s, 900.0) * 14.0 + pow(s, 24.0) * 0.55 + pow(s, 4.0) * 0.16);
      c = mix(c, colors[0] * 0.8, smoothstep(0.0, -0.25, d.z));
      gl_FragColor = vec4(c, 1.0);
    }`,
    }),
  );

  const scene = new THREE.Scene();
  scene.add(sky);
  const background = new THREE.WebGLCubeRenderTarget(256, {
    type: THREE.HalfFloatType,
  });
  const camera = new THREE.CubeCamera(0.1, 1000, background);
  const generator = new THREE.PMREMGenerator(renderer);
  const previousTarget = renderer.getRenderTarget();
  const previousToneMapping = renderer.toneMapping;
  renderer.toneMapping = THREE.NoToneMapping;
  try {
    camera.update(renderer, scene);
    const environment = generator.fromCubemap(background.texture);
    return {
      background,
      environment,
      backdrop: createSkyBackdrop(background.texture),
    };
  } catch (error) {
    background.dispose();
    throw error;
  } finally {
    renderer.setRenderTarget(previousTarget);
    renderer.toneMapping = previousToneMapping;
    generator.dispose();
    sky.geometry.dispose();
    sky.material.dispose();
  }
}
