import * as THREE from "three";

type Region = [number, number, number][];

/**
 * Applies the shared region overflow to existing preview receivers in world XY
 * meters. Caller owns textures/materials; this adds no overlapping geometry.
 */
export function asphaltOverflow(material: THREE.MeshStandardMaterial, regions: Region[], source: THREE.MeshStandardMaterial): void {
  if (!regions.length || !source.map || !source.normalMap) return;
  const corners = regions.flatMap(region => region.map(p => new THREE.Vector2(p[0], p[1])));
  const compile = material.onBeforeCompile;
  const cacheKey = material.customProgramCacheKey();
  material.onBeforeCompile = (shader, renderer) => {
    compile.call(material, shader, renderer);
    shader.uniforms.overflowCorners = { value: corners };
    shader.uniforms.overflowColor = { value: source.map };
    shader.uniforms.overflowNormal = { value: source.normalMap };
    shader.uniforms.overflowNormalScale = { value: source.normalScale };
    shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nvarying vec2 vOverflowWorld;");
    shader.vertexShader = shader.vertexShader.replace("#include <project_vertex>",
      "#include <project_vertex>\nvOverflowWorld = (modelMatrix * vec4(transformed, 1.0)).xy;");
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `#include <common>
      varying vec2 vOverflowWorld;
      uniform vec2 overflowCorners[${corners.length}];
      uniform sampler2D overflowColor;
      uniform sampler2D overflowNormal;
      uniform vec2 overflowNormalScale;
      float overflowNoise(vec2 p) {
        vec2 cell = floor(p), f = fract(p);
        f = f*f*(3.0-2.0*f);
        vec4 h = fract(sin(vec4(dot(cell,vec2(127.1,311.7)),
          dot(cell+vec2(1,0),vec2(127.1,311.7)),
          dot(cell+vec2(0,1),vec2(127.1,311.7)),
          dot(cell+vec2(1,1),vec2(127.1,311.7))))*43758.5453);
        return mix(mix(h.x,h.y,f.x),mix(h.z,h.w,f.x),f.y);
      }
      float overflowCoverage(vec2 p) {
        float distance = -1e6;
        for (int r=0; r<${regions.length}; r++) {
          float regionDistance = 1e6;
          for (int e=0; e<4; e++) {
            vec2 a=overflowCorners[r*4+e], b=overflowCorners[r*4+(e+1)%4];
            vec2 edge=b-a;
            regionDistance=min(regionDistance, (edge.x*(p.y-a.y)-edge.y*(p.x-a.x))/length(edge));
          }
          distance=max(distance,regionDistance);
        }
        float erosion=(overflowNoise(p*19.0)-0.5)*0.08
          +(overflowNoise(p*67.0)-0.5)*0.025
          +(overflowNoise(p*157.0)-0.5)*0.008;
        float field=distance+0.30+erosion;
        float pixel=max(fwidth(field)*0.5,0.001);
        return smoothstep(-pixel,pixel,field);
      }`);
    shader.fragmentShader = shader.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
      float asphaltCover = overflowCoverage(vOverflowWorld);
      vec2 asphaltUV = vOverflowWorld * 0.6666666667;
      diffuseColor.rgb = mix(diffuseColor.rgb, texture2D(overflowColor, asphaltUV).rgb, asphaltCover);`);
    shader.fragmentShader = shader.fragmentShader.replace("#include <lights_physical_fragment>", `
      vec3 asphaltNormal = texture2D(overflowNormal, asphaltUV).xyz * 2.0 - 1.0;
      asphaltNormal.xy *= overflowNormalScale;
      vec3 receiverNormal = normalize(nonPerturbedNormal);
      vec3 axisX = mat3(viewMatrix) * vec3(1.0, 0.0, 0.0);
      vec3 axisY = mat3(viewMatrix) * vec3(0.0, 1.0, 0.0);
      vec3 projectedX = axisX - receiverNormal * dot(axisX, receiverNormal);
      if (dot(projectedX, projectedX) < 0.001)
        projectedX = axisY - receiverNormal * dot(axisY, receiverNormal);
      vec3 tangentX = normalize(projectedX);
      vec3 tangentY = normalize(cross(receiverNormal, tangentX));
      vec3 mappedNormal = normalize(tangentX * asphaltNormal.x + tangentY * asphaltNormal.y + receiverNormal * asphaltNormal.z);
      normal = normalize(mix(normal, mappedNormal, asphaltCover));
      roughnessFactor = mix(roughnessFactor, 0.94, asphaltCover);
      #include <lights_physical_fragment>`);
  };
  material.customProgramCacheKey = () => `${cacheKey}/asphalt-overflow/${regions.length}`;
  material.needsUpdate = true;
}
