/**
 * Plaster coating in two-meter UV units. Shared concrete noise and sampling
 * functions supply clumped erosion and repeat suppression; height is in meters.
 */
export const plasterSampling = /* glsl */ `
uniform sampler2D plasterMap;
uniform float plasterEnabled;
uniform float plasterChips;

// x is derivative-free exposed coverage, y is filtered color coverage.
vec2 plasterExposure(vec2 uv) {
  vec2 p = uv * vec2(2.4, 2.0) + vec2(28.1, 4.7);
  float threshold = 0.60;
  vec2 warp = vec2(concreteFractal(p * 2.3 + vec2(7.1, 31.8)),
    concreteFractal(p * 2.3 + vec2(53.2, 9.4))) - 0.5;
  float broad = concreteFractal(p + warp * 0.18 * edgeJaggedness);
  // Fine, dense erosion roughens the outline while the broad field keeps patches clumped.
  float detail = (concreteNoise(p * 13.0) - 0.5) * 0.055
    + (concreteNoise(p * 31.0 + 17.3) - 0.5) * 0.015
    + (concreteNoise(p * 83.0 + 39.1) - 0.5) * 0.028
    + (concreteNoise(p * 173.0 + 81.7) - 0.5) * 0.012
    + (concreteNoise(p * 347.0 + 13.9) - 0.5) * 0.004;
  float border = 1.0 - smoothstep(0.025, 0.08, abs(broad - threshold));
  float field = broad + detail * edgeJaggedness * border;
  float coverage = smoothstep(threshold - 0.002, threshold + 0.002, field);
  // Keep the material break crisp; fuzziness comes from the eroded contour.
  float filterWidth = max(fwidth(field) * 0.5, 0.002);
  float filtered = smoothstep(threshold - filterWidth, threshold + filterWidth, field);
  return vec2(coverage, filtered) * plasterChips * plasterEnabled;
}

vec3 plasterColor(vec2 uv) {
  vec3 mean = vec3(0.7364711473, 0.6666688006, 0.5692678346);
  vec3 color = concreteSample(plasterMap, mean, uv).rgb;
  float mottling = concreteFractal(uv * vec2(3.7, 2.8) + 19.2);
  color *= 1.0 - darknessAmount * mottling;
  return concretePigment(color, uv * vec2(0.85, 0.68));
}

// Fine mineral grain and a thin chipped lip respond to the live lights.
float plasterHeight(vec2 uv, float exposed) {
  float grain = concreteNoise(uv * 480.0) * 0.00016
    + concreteFractal(uv * 65.0) * 0.00035;
  return (0.004 + grain) * (1.0 - exposed);
}
`;
