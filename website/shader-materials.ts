import * as THREE from "three";
import type { Material, CompiledLevel } from "../src/vector/types.ts";
const images = import.meta.glob<string>("./assets/detail/*.png", {
  eager: true,
  query: "?url",
  import: "default",
});
export const detailURLs = Object.fromEntries(
  Object.entries(images).map(([path, url]) => [path.split("/").pop()!, url]),
);
export { changedObjects } from "./geometry-change.ts";
export function makeSurface(
  def: Material | undefined,
  map: THREE.Texture | undefined,
  details: Map<string, THREE.Texture>,
  enhanced: boolean,
) {
  const texture = def?.texture?.split("/").pop()?.replace(".png", "") ?? "";
  const ceramic = /zellige|azulejo/.test(texture),
    metal = (def?.metalness ?? 0) > 0.4;
  const params = {
    color: def?.color ?? "#c6ac89",
    map,
    roughness: def?.roughness ?? 0.85,
    metalness: def?.metalness ?? 0,
    emissive: def?.id === "lamp" ? "#ffd292" : "#000000",
    emissiveIntensity: def?.id === "lamp" ? (enhanced ? 2.4 : 0.25) : 0,
    normalMap: enhanced ? details.get(`${texture}-normal.png`) : undefined,
    normalScale: new THREE.Vector2(ceramic ? 0.3 : 0.45, ceramic ? 0.3 : 0.45),
    roughnessMap: enhanced ? details.get(`${texture}-rough.png`) : undefined,
  };
  if (enhanced && (ceramic || metal))
    return new THREE.MeshPhysicalMaterial({
      ...params,
      clearcoat: ceramic ? 0.6 : 0,
      clearcoatRoughness: 0.24,
      anisotropy: metal ? 0.25 : 0,
    });
  return new THREE.MeshStandardMaterial(params);
}
export function installSurfaceShader(
  material: THREE.MeshStandardMaterial,
  pulse: { value: number },
  baked: boolean,
) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.lsPulse = pulse;
    shader.vertexShader =
      "attribute float lsChanged; varying float vLsChanged; varying vec3 vLsPosition;\n" +
      shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nvLsChanged=lsChanged;vLsPosition=position;",
    );
    shader.fragmentShader =
      "uniform float lsPulse; varying float vLsChanged; varying vec3 vLsPosition;\n" +
      shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <emissivemap_fragment>",
      "#include <emissivemap_fragment>\nfloat editBand=0.55+0.45*sin(vLsPosition.z*2.0-lsPulse*8.0); totalEmissiveRadiance+=vec3(0.12,0.65,0.48)*vLsChanged*lsPulse*editBand;",
    );
    if (baked) {
      const begin = THREE.ShaderChunk.lights_fragment_begin,
        end = THREE.ShaderChunk.lights_fragment_end;
      if (
        !begin.includes("getAmbientLightIrradiance") ||
        !end.includes("irradiance += iblIrradiance;")
      )
        throw new Error("Unsupported hybrid lighting shader.");
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <lights_fragment_begin>",
        begin
          .replace(
            "getAmbientLightIrradiance( ambientLightColor )",
            "vec3( 0.0 )",
          )
          .replace(/irradiance \+= getHemisphereLightIrradiance\([^;]+;/g, ""),
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <lights_fragment_end>",
        end.replace(
          "irradiance += iblIrradiance;",
          "// Diffuse skylight is already in the calibrated lightmap.",
        ),
      );
    }
  };
  material.customProgramCacheKey = () =>
    `levelspec-surface-1-${baked}-${THREE.REVISION}`;
}
