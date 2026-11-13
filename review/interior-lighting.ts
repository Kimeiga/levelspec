import * as THREE from "three";

/** A rigid room frame: local X across, Y inward from the opening, Z up; dimensions are meters. */
export interface InteriorLightingRegion {
  worldToRoom: THREE.Matrix4;
  size: THREE.Vector3;
}

/** Validates and snapshots rigid frames before any material ownership changes. */
function roomSnapshot(region: InteriorLightingRegion): InteriorLightingRegion {
  const matrix = region.worldToRoom.clone(), e = matrix.elements;
  const size = region.size.clone();
  const rows = [new THREE.Vector3(e[0], e[4], e[8]), new THREE.Vector3(e[1], e[5], e[9]), new THREE.Vector3(e[2], e[6], e[10])];
  if (!e.every(Number.isFinite) || !size.toArray().every(value => Number.isFinite(value) && value > 0)
    || Math.abs(e[3]) + Math.abs(e[7]) + Math.abs(e[11]) + Math.abs(e[15] - 1) > 1e-8
    || rows.some(row => Math.abs(row.lengthSq() - 1) > 1e-6)
    || Math.abs(rows[0].dot(rows[1])) + Math.abs(rows[1].dot(rows[2])) + Math.abs(rows[2].dot(rows[0])) > 1e-6)
    throw new Error("Interior lighting requires finite rigid room frames and positive meter dimensions.");
  return { worldToRoom: matrix, size };
}

/** Opaque diffuse receivers get room shading; glazing and luminous fittings keep their own response. */
function receivesInteriorLight(material: THREE.Material): material is THREE.MeshStandardMaterial {
  if (!(material instanceof THREE.MeshStandardMaterial)) return false;
  return !material.transparent && material.opacity === 1
    && !(material instanceof THREE.MeshPhysicalMaterial && material.transmission > 0)
    && material.emissive.getHex() === 0;
}

/**
 * Runtime art lighting for recessed shops: attenuate daytime interiors with depth,
 * then lift their warm diffuse response at night. Material maps, geometry and external
 * material owners remain untouched. Dispose before reinstalling on the same root.
 */
export class InteriorLighting {
  private readonly night = { value: 0 };
  private readonly bindings: {
    mesh: THREE.Mesh;
    original: THREE.Material | THREE.Material[];
    installed: THREE.Material | THREE.Material[];
    owned: THREE.Material[];
  }[] = [];
  private readonly materials = new Map<THREE.Material, THREE.MeshStandardMaterial>();
  private disposed = false;

  constructor(root: THREE.Object3D, regions: readonly InteriorLightingRegion[]) {
    const rooms = regions.map(roomSnapshot);
    if (!rooms.length) return;
    root.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      const original = object.material;
      const source = Array.isArray(original) ? original : [original];
      if (!source.some(receivesInteriorLight)) return;
      const replacements = source.map(material => {
        if (!receivesInteriorLight(material)) return material;
        let clone = this.materials.get(material);
        if (!clone) {
          clone = this.roomMaterial(material, rooms);
          this.materials.set(material, clone);
        }
        return clone;
      });
      const installed = Array.isArray(original) ? replacements : replacements[0];
      object.material = installed;
      this.bindings.push({ mesh: object, original, installed, owned: [...replacements] });
    });
  }

  /** Adds a fragment-space room test after physical lighting and before tone mapping. */
  private roomMaterial(source: THREE.MeshStandardMaterial, rooms: InteriorLightingRegion[]): THREE.MeshStandardMaterial {
    const material = source.clone(), before = source.onBeforeCompile, cacheKey = source.customProgramCacheKey();
    material.customProgramCacheKey = () => `${cacheKey}/interior-lighting/v1/${rooms.length}`;
    material.onBeforeCompile = (shader, renderer) => {
      before.call(material, shader, renderer);
      shader.uniforms.lsInteriorNight = this.night;
      shader.uniforms.lsWorldToRoom = { value: rooms.map(room => room.worldToRoom) };
      shader.uniforms.lsRoomSize = { value: rooms.map(room => room.size) };
      shader.vertexShader = `varying vec3 lsInteriorWorld;\n${shader.vertexShader}`.replace("#include <worldpos_vertex>", `
        #include <worldpos_vertex>
        vec4 lsRoomPosition = vec4(transformed, 1.0);
        #ifdef USE_BATCHING
          lsRoomPosition = batchingMatrix * lsRoomPosition;
        #endif
        #ifdef USE_INSTANCING
          lsRoomPosition = instanceMatrix * lsRoomPosition;
        #endif
        lsInteriorWorld = (modelMatrix * lsRoomPosition).xyz;
      `);
      shader.fragmentShader = `
        varying vec3 lsInteriorWorld;
        uniform float lsInteriorNight;
        uniform mat4 lsWorldToRoom[${rooms.length}];
        uniform vec3 lsRoomSize[${rooms.length}];
        ${shader.fragmentShader}
      `.replace("#include <opaque_fragment>", `
        float lsInteriorWeight = 0.0;
        for (int i = 0; i < ${rooms.length}; i++) {
          vec3 room = (lsWorldToRoom[i] * vec4(lsInteriorWorld, 1.0)).xyz;
          vec3 size = lsRoomSize[i];
          if (room.x >= -0.001 && room.x <= size.x + 0.001
              && room.y >= 0.025 && room.y <= size.y + 0.001
              && room.z >= -0.001 && room.z <= size.z + 0.001) {
            float depth = clamp(room.y / size.y, 0.0, 1.0);
            lsInteriorWeight = max(lsInteriorWeight, 0.35 + 0.65 * depth);
          }
        }
        outgoingLight *= mix(1.0 - 0.72 * lsInteriorWeight, 1.0 + 0.25 * lsInteriorWeight, lsInteriorNight);
        outgoingLight += diffuseColor.rgb * vec3(1.0, 0.76, 0.48) * 0.6 * lsInteriorWeight * lsInteriorNight;
        #include <opaque_fragment>
      `);
    };
    return material;
  }

  /** Switching modes changes one uniform; it never allocates maps or recompiles shaders. */
  setTimeOfDay(time: "day" | "night"): void {
    if (!this.disposed) this.night.value = time === "night" ? 1 : 0;
  }

  /** Restores bindings still owned by this effect and releases only its cloned materials. */
  dispose(): void {
    if (this.disposed) return;
    for (const { mesh, original, installed, owned } of this.bindings) {
      if (mesh.material !== installed) continue;
      if (Array.isArray(installed) && Array.isArray(original)
        && (installed.length !== owned.length || installed.some((material, index) => material !== owned[index]))) {
        for (let i = 0; i < installed.length; i++) if (installed[i] === owned[i]) installed[i] = original[i];
      } else mesh.material = original;
    }
    for (const material of this.materials.values()) material.dispose();
    this.materials.clear();
    this.bindings.length = 0;
    this.disposed = true;
  }
}
