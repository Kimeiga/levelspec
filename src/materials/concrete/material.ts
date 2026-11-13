import { MeshStandardMaterial, Vector3, type Texture } from "three";
import { plasterSampling } from "./plaster.ts";
import { topGrimeMask } from "./grime.ts";

// Linear RGB mean of the source texture; contrast correction blends around this color.
const SOURCE_MEAN = new Vector3(0.37286770477657405, 0.3662141145046476, 0.3582086447939772);

const sampling = /* glsl */ `
varying vec2 vConcreteFaceHalfSize;
varying float vConcreteTopDistance;
uniform sampler2D concreteGrimeMask;
uniform float concreteGrime;
uniform float concreteGround;
uniform float concreteVariation;
uniform float concreteCutouts;
uniform float concreteHoles;
uniform vec3 concreteMean;
uniform sampler2D concreteMapB;
uniform vec3 concreteMeanB;
uniform float darknessAmount;
uniform float darknessAmountB;
uniform float blendScale;
uniform float blendContrast;
uniform float edgeJaggedness;
uniform float hueAmount;
uniform float hueAngle;

vec3 concreteHash(vec2 cell) {
  return fract(sin(vec3(dot(cell, vec2(127.1, 311.7)),
    dot(cell, vec2(269.5, 183.3)), dot(cell, vec2(419.2, 371.9)))) * 43758.5453);
}

float concreteNoise(vec2 p) {
  vec2 cell = floor(p), f = fract(p);
  f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(mix(concreteHash(cell).x, concreteHash(cell + vec2(1, 0)).x, f.x),
    mix(concreteHash(cell + vec2(0, 1)).x, concreteHash(cell + vec2(1, 1)).x, f.x), f.y);
}

float concreteFractal(vec2 p) {
  float value = 0.0, amplitude = 0.5, total = 0.0;
  mat2 turn = mat2(0.8, -0.6, 0.6, 0.8);
  for (int octave = 0; octave < 3; octave++) {
    value += concreteNoise(p) * amplitude;
    total += amplitude;
    p = turn * p * 2.03 + vec2(13.7, 9.2);
    amplitude *= 0.28;
  }
  return value / total;
}

float concreteFracture(vec2 p) {
  vec2 warp = vec2(concreteFractal(p * 2.3 + vec2(7.1, 31.8)),
    concreteFractal(p * 2.3 + vec2(53.2, 9.4))) - 0.5;
  vec2 q = p + warp * 0.18 * edgeJaggedness;
  float detail = (concreteNoise(p * 13.0) - 0.5) * 0.20
    + (concreteNoise(p * 31.0 + 17.3) - 0.5) * 0.11
    + (concreteNoise(p * 73.0 + 39.1) - 0.5) * 0.06
    + (concreteNoise(p * 151.0 + 81.7) - 0.5) * 0.025;
  float broad = concreteFractal(q);
  // Fine erosion lives at the contour, leaving the clump interiors coherent.
  float border = 1.0 - smoothstep(0.045, 0.18, abs(broad - 0.5));
  return broad + detail * edgeJaggedness * border;
}

float concreteEdge(float field, float width) {
  float antialias = max(fwidth(field), 0.001);
  return smoothstep(0.5 - max(width, antialias), 0.5 + max(width, antialias), field);
}

// Filled repair rectangles stay inside construction panels; narrow box faces stay plain.
vec3 concreteCutout(vec2 meters) {
  vec2 panel = floor(meters / vec2(2.0, 1.6));
  vec3 random = concreteHash(panel + vec2(81.3, 42.7));
  if (concreteCutouts < 0.5 || min(vConcreteFaceHalfSize.x, vConcreteFaceHalfSize.y) < 0.5
      || random.x < 0.28) return vec3(100.0, 0.0, 0.0);
  vec2 center = (panel + 0.5) * vec2(2.0, 1.6) + (random.yz - 0.5) * vec2(0.35, 0.25);
  vec2 halfSize = vec2(0.30, 0.22) + random.zy * vec2(0.25, 0.19);
  vec2 q = abs(meters - center) - halfSize;
  float distance = length(max(q, vec2(0.0))) + min(max(q.x, q.y), 0.0);
  return vec3(distance, random.y * 2.0 - 1.0, random.z * 2.0 - 1.0);
}

// Returns recess height in meters, cavity darkness, and exposed chipped concrete.
vec3 concreteSeam(vec2 meters) {
  float verticalJoint = abs(mod(meters.x + 1.0, 2.0) - 1.0);
  vec2 rim = max(vConcreteFaceHalfSize - abs(meters), vec2(0.0));
  float distanceToSeam = min(verticalJoint, min(rim.x, rim.y));
  distanceToSeam = min(distanceToSeam, abs(concreteCutout(meters).x));
  float pixel = max(length(fwidth(meters)) * 0.65, 0.0006);
  float grain = concreteNoise(meters * 137.0 + vec2(3.1, 8.7));
  float pockets = smoothstep(0.40, 0.78, concreteFractal(meters * 22.0));
  float chippedWidth = 0.009 + pockets * 0.037 + (grain - 0.5) * 0.006;
  float groove = 1.0 - smoothstep(0.002, 0.006 + pixel, distanceToSeam);
  float chip = 1.0 - smoothstep(chippedWidth * 0.4, chippedWidth + pixel, distanceToSeam);
  // Height stays derivative-free; only color coverage uses screen-space widening.
  float heightGroove = 1.0 - smoothstep(0.002, 0.006, distanceToSeam);
  float heightChip = 1.0 - smoothstep(chippedWidth * 0.4, chippedWidth, distanceToSeam);
  float height = -0.006 * heightGroove - 0.004 * heightChip * (0.5 + 0.5 * grain);
  return vec3(height, groove * 0.24 + chip * 0.055, chip * (1.0 - groove));
}

// Form-tie holes affect normal relief only; their color channels remain zero.
vec3 concreteHole(vec2 meters) {
  vec2 center = floor(meters) + 0.5;
  vec2 clearance = vConcreteFaceHalfSize - abs(center);
  if (concreteHoles < 0.5 || min(clearance.x, clearance.y) < 0.04) return vec3(0.0);
  vec2 local = meters - center;
  float chip = (concreteNoise(meters * 190.0) - 0.5) * 0.003;
  float radius = length(local) + chip;
  float recess = 1.0 - smoothstep(0.017, 0.028, radius);
  return vec3(-0.012 * recess, 0.0, 0.0);
}

// Surface-gradient bump mapping keeps recess depth in meters on every box face.
vec3 concreteSeamNormal(vec3 position, vec3 surfaceNormal, float height) {
  vec3 dx = dFdx(position), dy = dFdy(position);
  vec3 acrossY = cross(dy, surfaceNormal), acrossX = cross(surfaceNormal, dx);
  float determinant = dot(dx, acrossY);
  vec3 gradient = sign(determinant) * (dFdx(height) * acrossY + dFdy(height) * acrossX);
  return normalize(max(abs(determinant), 1e-10) * surfaceNormal - gradient);
}

vec3 concretePigment(vec3 color, vec2 uv) {
  float hueNoise = concreteFractal(uv * 4.68 + vec2(41.2, 3.7)) * 2.0 - 0.7;
  vec3 direction = cos(vec3(hueAngle) + vec3(0.0, -2.0943951, 2.0943951));
  vec3 luminance = vec3(0.2126, 0.7152, 0.0722);
  direction -= vec3(dot(direction, luminance));
  return max(vec3(0.0), color + direction * hueNoise * hueAmount * dot(color, luminance));
}

vec3 concretePatch(sampler2D source, vec2 uv, vec2 cell, vec2 dx, vec2 dy) {
  vec3 random = concreteHash(cell + vec2(19.0, 47.0));
  float angle = (random.z - 0.5) * 0.32;
  float c = cos(angle), s = sin(angle);
  mat2 rotation = mat2(c, -s, s, c);
  return textureGrad(source, rotation * uv + random.xy, rotation * dx, rotation * dy).rgb;
}

vec4 concreteSample(sampler2D source, vec3 mean, vec2 uv) {
  vec2 dx = dFdx(uv), dy = dFdy(uv);
  if (concreteVariation < 0.5) return textureGrad(source, uv, dx, dy);
  vec2 skewed = vec2(uv.x - uv.y / sqrt(3.0), uv.y * 2.0 / sqrt(3.0));
  vec2 cell = floor(skewed), f = fract(skewed);
  vec2 a, b, c;
  vec3 weights;
  if (f.x + f.y < 1.0) {
    a = cell; b = cell + vec2(1.0, 0.0); c = cell + vec2(0.0, 1.0);
    weights = vec3(1.0 - f.x - f.y, f.x, f.y);
  } else {
    a = cell + vec2(1.0, 1.0); b = cell + vec2(0.0, 1.0); c = cell + vec2(1.0, 0.0);
    weights = vec3(f.x + f.y - 1.0, 1.0 - f.x, 1.0 - f.y);
  }
  weights = pow(max(weights, vec3(0.0)), vec3(3.0));
  weights /= weights.x + weights.y + weights.z;
  vec3 blended = concretePatch(source, uv, a, dx, dy) * weights.x
    + concretePatch(source, uv, b, dx, dy) * weights.y
    + concretePatch(source, uv, c, dx, dy) * weights.z;
  vec3 color = mean + (blended - mean) / sqrt(dot(weights, weights));
  return vec4(clamp(color, 0.0, 1.0), 1.0);
}
${plasterSampling}
vec4 layeredConcrete(vec2 uv, vec3 relief, vec2 exposure) {
  vec3 a = concreteSample(map, concreteMean, uv).rgb;
  vec3 b = concreteSample(concreteMapB, concreteMeanB, uv * 1.13 + vec2(3.7, 11.2)).rgb;
  b *= mix(vec3(1.0), concreteMean / concreteMeanB, 0.9);
  // Broader noise stretches vertically without stretching the source texture grain.
  vec2 noiseUv = uv * vec2(0.85, 0.68);
  float darkA = concreteEdge(concreteFracture(noiseUv * 5.4 + vec2(5.3, 17.1)), 0.035);
  float darkB = concreteEdge(concreteFracture(noiseUv * 8.28 + vec2(73.4, 29.6)), 0.035);
  a *= 1.0 - darknessAmount * darkA;
  b *= 1.0 - darknessAmountB * darkB;
  float mask = concreteFracture(noiseUv * blendScale + vec2(113.2, 67.8));
  float width = 0.045 / blendContrast;
  float blend = concreteEdge(mask, width);
  vec3 color = concretePigment(mix(a, b, blend), noiseUv);
  vec3 cutout = concreteCutout(uv * 2.0);
  float cutoutCoverage = 1.0 - smoothstep(-0.003, 0.003, cutout.x);
  vec3 repairTint = vec3(0.045, 0.020, -0.025) * cutout.y;
  color *= vec3(1.0) + cutoutCoverage * (vec3(cutout.z * 0.14) + repairTint);
  color *= 1.0 - min(relief.y, 0.85);
  color += vec3(0.012, 0.011, 0.009) * relief.z;
  if (plasterEnabled > 0.5) {
    color = mix(plasterColor(uv), color, exposure.y);
  }
  float grime = pow(texture2D(concreteGrimeMask, vec2(uv.x * 0.25, vConcreteTopDistance)).r, 0.75)
    * concreteGrime * (1.0 - smoothstep(0.85, 1.0, vConcreteTopDistance));
  color *= vec3(1.0) - grime * vec3(0.68, 0.72, 0.76);
  return vec4(color, 1.0);
}
`;

/**
 * Concrete substrate with an optional chipped plaster coating. Caller-owned source
 * textures are shared across switches. UV units represent two meters of wall. Three
 * smoothly weighted offset/rotation samples hide the source image's regular repeat.
 * Ground mode preserves authored slab joints and adds fine mineral relief instead
 * of wall seams, repairs, tie holes, or top-edge grime.
 * The material-map exporter uses this same shader to cache portable intrinsic PBR maps.
 */
export function concreteMaterial(texture: Texture, textureB: Texture, plasterTexture: Texture, surface: "wall" | "ground" = "wall"): {
  material: MeshStandardMaterial;
  setPlaster(enabled: boolean): void;
  setChips(enabled: boolean): void;
  setVariation(enabled: boolean): void;
  setCutouts(enabled: boolean): void;
  setHoles(enabled: boolean): void;
  setGrime(enabled: boolean): void;
  setPigment(darkness: number, hue: number, degrees: number): void;
  setBlend(darknessB: number, scale: number, contrast: number, jaggedness: number): void;
} {
  const plaster = { value: 0 };
  const chips = { value: 1 };
  const variation = { value: 1 };
  const cutouts = { value: surface === "wall" ? 1 : 0 };
  const holes = { value: surface === "wall" ? 1 : 0 };
  const grime = { value: surface === "wall" ? 1 : 0 };
  const darkness = { value: 0.10 }, hue = { value: 0.05 }, angle = { value: Math.PI / 3 };
  const darknessB = { value: 0.13 }, scale = { value: 9 }, contrast = { value: 1.0 }, jaggedness = { value: 0.8 };
  const material = new MeshStandardMaterial({ map: texture, roughness: 0.96, metalness: 0 });
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace("#include <common>",
      "#include <common>\nattribute vec2 concreteFaceHalfSize;\nattribute float concreteTopDistance;\nvarying float vConcreteTopDistance;\nvarying vec2 vConcreteFaceHalfSize;");
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>",
      "#include <begin_vertex>\nvConcreteFaceHalfSize = concreteFaceHalfSize;\nvConcreteTopDistance = concreteTopDistance;");
    shader.uniforms.plasterEnabled = plaster;
    shader.uniforms.plasterChips = chips;
    shader.uniforms.plasterMap = { value: plasterTexture };
    shader.uniforms.concreteVariation = variation;
    shader.uniforms.concreteCutouts = cutouts;
    shader.uniforms.concreteHoles = holes;
    shader.uniforms.concreteGrime = grime;
    shader.uniforms.concreteGround = { value: surface === "ground" ? 1 : 0 };
    shader.uniforms.concreteGrimeMask = { value: topGrimeMask() };
    shader.uniforms.darknessAmount = darkness;
    shader.uniforms.darknessAmountB = darknessB;
    shader.uniforms.blendScale = scale;
    shader.uniforms.edgeJaggedness = jaggedness;
    shader.uniforms.blendContrast = contrast;
    shader.uniforms.concreteMapB = { value: textureB };
    shader.uniforms.concreteMeanB = { value: new Vector3(0.20798059217157364, 0.20320214220777086, 0.18970546072187944) };
    shader.uniforms.hueAmount = hue;
    shader.uniforms.hueAngle = angle;
    shader.uniforms.concreteMean = { value: SOURCE_MEAN };
    shader.fragmentShader = shader.fragmentShader.replace("#include <map_pars_fragment>",
      `#include <map_pars_fragment>\n${sampling}`);
    shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>",
      `vec3 concreteRelief = vec3(0.0);
      if (concreteGround < 0.5) {
        concreteRelief = concreteSeam(vMapUv * 2.0) + concreteHole(vMapUv * 2.0);
      } else {
        concreteRelief.x = concreteFractal(vMapUv * 65.0) * 0.0006
          + concreteNoise(vMapUv * 420.0) * 0.00018;
      }
      vec2 plasterExposed = plasterExposure(vMapUv);
      float surfaceHeight = concreteRelief.x;
      if (plasterEnabled > 0.5) {
        surfaceHeight = concreteRelief.x * plasterExposed.x + plasterHeight(vMapUv, plasterExposed.x);
      }
      diffuseColor *= layeredConcrete(vMapUv, concreteRelief, plasterExposed);`);
    shader.fragmentShader = shader.fragmentShader.replace("#include <normal_fragment_maps>",
      `#include <normal_fragment_maps>
      normal = concreteSeamNormal(-vViewPosition, normal, surfaceHeight);`);
  };
  material.customProgramCacheKey = () => "shared-concrete-v1";
  return {
    material,
    /** Switches the coating without reallocating shared source textures. */
    setPlaster(enabled) { plaster.value = enabled ? 1 : 0; },
    /** Toggles plaster loss; intact plaster hides substrate relief and color. */
    setChips(enabled) { chips.value = enabled ? 1 : 0; },
    setVariation(enabled) { variation.value = enabled ? 1 : 0; },
    /** Toggles filled repair patches and their seams without reallocating textures. */
    setCutouts(enabled) { cutouts.value = enabled ? 1 : 0; },
    /** Toggles regular form-tie recess shading without changing geometry or textures. */
    setHoles(enabled) { holes.value = enabled ? 1 : 0; },
    /** Changes coverage only; the shared mask stays cached. */
    setGrime(enabled) { grime.value = enabled ? 1 : 0; },
    /** Controls the second layer and the independent blend field without recompiling. */
    setBlend(strength, frequency, sharpness, edges) {
      if (![strength, frequency, sharpness, edges].every(Number.isFinite)) return;
      darknessB.value = Math.max(0, Math.min(0.8, strength));
      scale.value = Math.max(0.2, Math.min(16, frequency));
      jaggedness.value = Math.max(0, Math.min(2, edges));
      contrast.value = Math.max(1, Math.min(8, sharpness));
    },
    /** Updates bounded pigment strengths and a hue direction in degrees without recompiling the shader. */
    setPigment(darknessStrength, hueStrength, degrees) {
      if (![darknessStrength, hueStrength, degrees].every(Number.isFinite)) return;
      darkness.value = Math.max(0, Math.min(0.8, darknessStrength));
      hue.value = Math.max(0, Math.min(0.3, hueStrength));
      angle.value = degrees * Math.PI / 180;
    },
  };
}
