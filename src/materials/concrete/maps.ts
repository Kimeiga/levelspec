import { type Texture } from "three";
import { concreteMaterial } from "./material.ts";

/** Physical size and resolution of the shared, geometry-independent concrete maps. */
export const CONCRETE_MAP = { meters: 8, pixels: 2048, roughness: 0.96 } as const;

/**
 * Uses the production concrete shader to export intrinsic color or tangent normals.
 * The receiver must be an eight-meter XY plane viewed from +Z. No lights, shadows,
 * seams, holes, or geometry-specific weathering are included in these reusable maps.
 */
export function concreteMapMaterial(a: Texture, b: Texture, channel: "color" | "normal") {
  const { material } = concreteMaterial(a, b, a, "ground");
  const prepare = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    prepare.call(material, shader, renderer);
    shader.fragmentShader = shader.fragmentShader.replace("void main() {", `
      vec3 mapColor(vec2 uv) {
        return layeredConcrete(uv, vec3(0.0), vec2(0.0)).rgb;
      }
      float mapHeight(vec2 uv) {
        return concreteFractal(uv * 65.0) * 0.0006
          + concreteNoise(uv * 420.0) * 0.00018;
      }
      // Crossfade translated fields over the period, making both edges continuous.
      vec4 periodicConcrete(vec2 uv) {
        vec2 w = smoothstep(vec2(0.0), vec2(4.0), uv);
        vec2 a = uv, b = uv - vec2(4.0, 0.0);
        vec2 c = uv - vec2(0.0, 4.0), d = uv - vec2(4.0);
        return mix(mix(vec4(mapColor(a), mapHeight(a)), vec4(mapColor(b), mapHeight(b)), w.x),
          mix(vec4(mapColor(c), mapHeight(c)), vec4(mapColor(d), mapHeight(d)), w.x), w.y);
      }
      void main() {`);
    const start = shader.fragmentShader.indexOf("vec3 concreteRelief =");
    const end = shader.fragmentShader.indexOf("#include <color_fragment>", start);
    if (start < 0 || end < 0) throw new Error("Concrete map shader hooks are unavailable.");
    shader.fragmentShader = shader.fragmentShader.slice(0, start)
      + "vec4 intrinsic = periodicConcrete(vMapUv); float surfaceHeight = intrinsic.a; diffuseColor.rgb = intrinsic.rgb;\n"
      + shader.fragmentShader.slice(end);
    shader.fragmentShader = shader.fragmentShader.replace("#include <opaque_fragment>",
      channel === "color" ? "gl_FragColor = vec4(diffuseColor.rgb, 1.0);"
        : "gl_FragColor = vec4(normal * 0.5 + 0.5, 1.0);");
  };
  material.customProgramCacheKey = () => `shared-concrete-map-v1-${channel}`;
  return material;
}
