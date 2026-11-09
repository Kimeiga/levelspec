import { appendTerrainScene } from "./terrain.ts";
import * as THREE from "three";
import { ScreenOutlines } from "./outlines.ts";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { NavigationSurface } from "../website/navigation.ts";
import { bindWalkInput } from "../website/walk-input.ts";
import { navigationIndices } from "./navigation.ts";
import { MAX_WALK_PITCH, prepareInspectionWalk, type WalkPose, type WalkStartResult } from "./walk.ts";
import { WalkClock } from "../website/walk-clock.ts";
import type { CompiledLevel, ReviewFinding, V3 } from "../src/vector/types.ts";
import { type Appearance, type ViewOptions, type ViewState } from "./view.ts";

/** Returns the screen-up direction of Three's canonical Z-up camera, including its pole fallback. */
function zeroRollUp(position: THREE.Vector3, target: THREE.Vector3) {
  const basis = new THREE.Matrix4().lookAt(position, target, new THREE.Vector3(0, 0, 1));
  return new THREE.Vector3(0, 1, 0).transformDirection(basis);
}

export interface ReviewOptions {
  layer: string;
  roofs: boolean;
  cut: number;
  appearance: Appearance;
  movement: "land" | "water" | "";
  selected: string;
  suggestion?: ReviewFinding;
  issues: boolean;
}

/** Preview-only grayscale and stable randomized shading; authored materials remain untouched. */
function illustratedMaterial(color: THREE.Color, transparent: boolean) {
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 1,
    transparent,
    opacity: transparent ? 0.48 : 1,
    side: THREE.DoubleSide,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.reviewDitherCell = {
      value: Math.min(devicePixelRatio, 2) * 0.5,
    };
    shader.fragmentShader =
      "uniform float reviewDitherCell;\n" + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <opaque_fragment>",
      `
      float gray = dot(outgoingLight, vec3(0.2126,0.7152,0.0722));
      vec2 cell = floor(gl_FragCoord.xy/reviewDitherCell);
      vec3 noise = fract(vec3(cell.xyx) * 0.1031);
      noise += dot(noise, noise.yzx + 33.33);
      float threshold = max(0.000001, fract((noise.x + noise.y) * noise.z));
      float ramp = clamp(gray,0.0,1.0)*7.0;
      outgoingLight = vec3((floor(ramp)+step(threshold,fract(ramp)))/7.0);
      #include <opaque_fragment>`,
    );
  };
  material.customProgramCacheKey = () =>
    "levelspec-review-illustrated-fine-noise-v4";
  return material;
}

/** Owns review GPU resources and cameras, in meters and right-handed Z-up. */
export class ReviewScene {
  readonly renderer = new THREE.WebGLRenderer({ antialias: true });
  private orthographic = new THREE.OrthographicCamera(-20, 20, 20, -20, 0.01, 10000);
  private perspective = new THREE.PerspectiveCamera(55, 1, 0.01, 10000);
  camera: THREE.OrthographicCamera | THREE.PerspectiveCamera = this.orthographic;
  readonly controls: OrbitControls;
  readonly scene = new THREE.Scene();
  private model = new THREE.Group();
  private outlines = new ScreenOutlines();
  private walkCamera = new THREE.PerspectiveCamera(65, 1, 0.08, 10000);
  private plane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 1000);
  private box = new THREE.Box3();
  private size: ResizeObserver;
  private abort = new AbortController();
  private displayKey = "";
  private assetURLs: Record<string, string> = {};
  private textures = new Map<string, THREE.Texture>();
  private assetsChanged = false;
  private textureGeneration = 0;
  private disposed = false;
  private viewportAspect = 1;
  private frame = 0;
  private dirty = true;
  private visible = true;
  private level?: CompiledLevel;
  private surface?: NavigationSurface;
  private point: V3 = [0, 0, 0];
  private yaw = 0;
  private pitch = 0;
  private keys = new Set<string>();
  private clock = new WalkClock();
  private walking = false;
  private onWalk: (walking: boolean) => void;
  private sun = new THREE.DirectionalLight(0xffffff, 3);

  constructor(
    private host: HTMLElement,
    private select: (id: string) => void,
    onWalk: (walking: boolean) => void,
    onContext: (available: boolean) => void,
  ) {
    this.onWalk = onWalk;
    this.renderer.setPixelRatio(1);
    this.renderer.localClippingEnabled = true;
    this.renderer.shadowMap.enabled = false;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.scene.background = new THREE.Color("#f7f7f7");
    this.scene.add(
      this.model,
      new THREE.HemisphereLight(0xffffff, 0x696969, 1),
    );
    this.sun.position.set(30, -40, 60);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.normalBias = 0.03;
    this.scene.add(this.sun, this.sun.target);
    this.orthographic.up.set(0, 0, 1);
    this.perspective.up.set(0, 0, 1);
    this.walkCamera.up.set(0, 0, 1);
    host.append(this.renderer.domElement);
    this.renderer.domElement.tabIndex = 0;
    this.renderer.domElement.setAttribute(
      "aria-label",
      "3D layout. Drag to rotate horizontally, right drag to pan, scroll to zoom.",
    );
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.renderer.domElement.addEventListener("pointerdown", (event) => {
      if (!this.level || !event.isPrimary || this.walking || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey) return;
      this.centerOrbitPivot();
    }, { capture: true, signal: this.abort.signal });
    let interactionRoll: number | undefined;
    this.controls.addEventListener("start", () => {
      interactionRoll = this.getView().roll;
      const angle = this.controls.getPolarAngle();
      this.controls.minPolarAngle = angle;
      this.controls.maxPolarAngle = angle;
    });
    this.controls.addEventListener("end", () => {
      interactionRoll = undefined;
      this.controls.minPolarAngle = 0;
      this.controls.maxPolarAngle = Math.PI;
    });
    this.controls.addEventListener("change", () => {
      // Recompute image-up as the camera moves so a fixed world vector cannot roll the horizon.
      if (interactionRoll !== undefined) this.orientCamera(interactionRoll);
      this.invalidate();
    });
    this.size = new ResizeObserver(() => this.resize());
    this.size.observe(host);
    this.resize();
    const canvas = this.renderer.domElement;
    canvas.addEventListener(
      "webglcontextlost",
      (event) => {
        event.preventDefault();
        this.exitWalk();
        this.clearModel();
        this.outlines.resetTargets();
        this.clearTextures();
        this.sun.shadow.dispose();
        this.sun.shadow.map = null;
        this.displayKey = "";
        onContext(false);
      },
      { signal: this.abort.signal },
    );
    canvas.addEventListener(
      "webglcontextrestored",
      () => {
        this.displayKey = "";
        this.invalidate();
        onContext(true);
      },
      { signal: this.abort.signal },
    );
    let down = [0, 0];
    canvas.addEventListener(
      "pointerdown",
      (e) => {
        down = [e.clientX, e.clientY];
      },
      { signal: this.abort.signal },
    );
    canvas.addEventListener(
      "pointerup",
      (e) => {
        if (
          this.walking ||
          Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 4
        )
          return;
        const rect = canvas.getBoundingClientRect();
        const ray = new THREE.Raycaster();
        ray.setFromCamera(
          new THREE.Vector2(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            1 - ((e.clientY - rect.top) / rect.height) * 2,
          ),
          this.camera,
        );
        const hit = ray
          .intersectObjects(this.model.children)
          .find(
            (h) =>
              h.object instanceof THREE.Mesh &&
              h.point.z <= this.plane.constant,
          );
        if (hit) this.select(hit.object.userData.object ?? "");
      },
      { signal: this.abort.signal },
    );
    bindWalkInput(
      canvas,
      {
        walking: () => this.walking,
        look: (dx, dy) => {
          this.yaw -= dx * 0.003;
          this.pitch = THREE.MathUtils.clamp(
            this.pitch - dy * 0.003,
            -THREE.MathUtils.degToRad(MAX_WALK_PITCH),
            THREE.MathUtils.degToRad(MAX_WALK_PITCH),
          );
          this.invalidate();
        },
        key: (key, down) => {
          this.advanceWalk(performance.now());
          if (down) this.keys.add(key);
          else this.keys.delete(key);
          this.invalidate();
        },
        clear: () => {
          this.advanceWalk(performance.now());
          this.keys.clear();
        },
        exit: () => this.exitWalk(),
        mouseMode: () => {},
      },
      this.abort.signal,
    );
    document.addEventListener(
      "visibilitychange",
      () => {
        this.keys.clear();
        this.clock.reset(performance.now());
      },
      { signal: this.abort.signal },
    );
    this.renderer.setAnimationLoop((now) => this.render(now));
  }
  /** Anchors orbit depth to the visible screen center without changing the camera pose. */
  private centerOrbitPivot() {
    this.camera.updateMatrixWorld();
    this.model.updateMatrixWorld(true);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const hit = raycaster.intersectObjects(this.model.children).find(hit =>
      hit.object instanceof THREE.Mesh && hit.object.userData.object && hit.point.z <= this.plane.constant,
    );
    const pivot = hit?.point.clone();
    if (pivot) {
      this.controls.target.copy(pivot);
    } else {
      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
        this.camera.getWorldDirection(new THREE.Vector3()),
        this.box.getCenter(new THREE.Vector3()),
      );
      const point = raycaster.ray.intersectPlane(plane, new THREE.Vector3());
      if (!point) return;
      this.controls.target.copy(point);
    }
    this.controls.update();
    this.invalidate();
  }
  /** Resolves authored image names from bundled or explicitly supplied companion assets. */
  setAssets(urls: Record<string, string>) {
    if (this.assetURLs === urls) return;
    this.assetURLs = urls;
    this.assetsChanged = true;
    this.displayKey = "";
  }
  /** Invalidates pending callbacks and releases scene-owned textures after model disposal. */
  private clearTextures() {
    this.textureGeneration++;
    for (const texture of this.textures.values()) texture.dispose();
    this.textures.clear();
  }
  /** Lazily loads a shared texture; this scene owns its GPU lifetime. */
  private texture(reference: string) {
    const existing = this.textures.get(reference);
    if (existing) return existing;
    const url =
      this.assetURLs[reference] ?? this.assetURLs[reference.split("/").at(-1)!];
    if (!url) return undefined;
    const generation = this.textureGeneration;
    const texture = new THREE.TextureLoader().load(
      url,
      (loaded) => {
        if (this.disposed || generation !== this.textureGeneration) {
          loaded.dispose();
          return;
        }
        this.invalidate();
      },
      undefined,
      () => {
        if (this.disposed || generation !== this.textureGeneration) return;
        this.host.dispatchEvent(
          new CustomEvent("asset-error", { detail: reference }),
        );
      },
    );
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    this.textures.set(reference, texture);
    return texture;
  }
  /** Schedules a still frame; idle and hidden previews do not render. */
  invalidate() {
    this.dirty = true;
  }
  /** Hides GPU work when the plan occupies the viewport. */
  setVisible(value: boolean) {
    this.visible = value;
    if (!value) this.exitWalk();
    this.invalidate();
  }
  /** Maintains camera framing through container changes. */
  private resize() {
    const { width, height } = this.host.getBoundingClientRect();
    if (!width || !height) return;
    this.viewportAspect = width / height;
    this.renderer.setSize(width, height, false);
    const half = (this.orthographic.top - this.orthographic.bottom) / 2;
    this.orthographic.left = (-half * width) / height;
    this.orthographic.right = (half * width) / height;
    this.orthographic.updateProjectionMatrix();
    this.perspective.aspect = width / height;
    this.perspective.updateProjectionMatrix();
    this.walkCamera.aspect = width / height;
    this.walkCamera.updateProjectionMatrix();
    this.invalidate();
  }
  /** Releases all resources belonging to the previous display, including edge buffers. */
  private clearModel() {
    this.outlines.clear();
    this.model.traverse((object) => {
      if (
        object instanceof THREE.Mesh ||
        object instanceof THREE.Line ||
        object instanceof THREE.Points
      ) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        materials.forEach((m) => m.dispose());
      }
    });
    this.model.clear();
  }
  /** Rebuilds the presentation mesh without mutating compiled geometry or resetting the camera. */
  setLevel(level: CompiledLevel, options: ReviewOptions, fit = false) {
    this.plane.constant = THREE.MathUtils.lerp(
      this.box.min.z - 0.1,
      this.box.max.z + 0.1,
      options.cut,
    );
    const displayKey = JSON.stringify({ ...options, cut: 0 });
    if (this.level === level && this.displayKey === displayKey) {
      this.invalidate();
      return;
    }
    this.renderer.shadowMap.enabled = options.appearance !== "flat";
    const pixelRatio = options.appearance === "flat" ? 1 : Math.min(devicePixelRatio, 2);
    if (this.renderer.getPixelRatio() !== pixelRatio) {
      this.renderer.setPixelRatio(pixelRatio);
      this.resize();
    }
    this.displayKey = displayKey;
    this.exitWalk();
    this.level = level;
    this.clearModel();
    if (this.assetsChanged) {
      this.clearTextures();
      this.assetsChanged = false;
    }
    const { mesh, surfaces } = level;
    const glassObjects = new Set(
      level.document.layers.flatMap((layer) =>
        layer.edges
          .filter((edge) => edge.kind === "glass")
          .map((edge) => edge.id),
      ),
    );
    const groups = new Map<
      string,
      {
        positions: number[];
        normals: number[];
        uv: number[];
        object: string;
        material: string;
        water: boolean;
      }
    >();
    for (let t = 0; t < mesh.surfaces.length; t++) {
      const s = surfaces[mesh.surfaces[t]];
      if (
        s.visible === false ||
        (options.layer && s.layer !== options.layer) ||
        (!options.roofs && s.role === "roof")
      )
        continue;
      const key = JSON.stringify([s.object, s.material, s.kind]);
      let group = groups.get(key);
      if (!group) {
        group = {
          positions: [],
          normals: [],
          uv: [],
          object: s.object,
          material: s.material,
          water: s.kind === "water",
        };
        groups.set(key, group);
      }
      for (const i of mesh.indices.slice(t * 3, t * 3 + 3)) {
        group.positions.push(...mesh.positions.slice(i * 3, i * 3 + 3));
        group.normals.push(...mesh.normals.slice(i * 3, i * 3 + 3));
        group.uv.push(...mesh.uv.slice(i * 2, i * 2 + 2));
      }
    }
    for (const group of groups.values()) {
      const g = new THREE.BufferGeometry();
      g.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(group.positions, 3),
      );
      g.setAttribute(
        "normal",
        new THREE.Float32BufferAttribute(group.normals, 3),
      );
      g.setAttribute("uv", new THREE.Float32BufferAttribute(group.uv, 2));
      const def = level.document.materials.find((m) => m.id === group.material);
      const transparent =
        group.water ||
        glassObjects.has(group.object) ||
        /glass/i.test(group.material);
      const color = new THREE.Color(
        options.appearance !== "illustrated" ? (def?.color ?? "#dddddd") : "#eeeeee",
      );
      if (group.object === options.selected || options.suggestion?.objects.includes(group.object)) color.set("#a4beb8");
      let material: THREE.MeshStandardMaterial | THREE.MeshBasicMaterial;
      if (options.appearance === "illustrated") {
        material = illustratedMaterial(color, transparent);
      } else {
        const authored = {
          color,
          map: def?.texture ? this.texture(def.texture) : null,
          transparent,
          opacity: transparent ? 0.48 : 1,
          side: THREE.DoubleSide,
        };
        material = (options.appearance === "inspection" || options.appearance === "flat")
          ? new THREE.MeshBasicMaterial({ ...authored, toneMapped: false })
          : new THREE.MeshStandardMaterial({
              ...authored,
              roughness: def?.roughness ?? 1,
              metalness: def?.metalness ?? 0,
            });
      }
      material.clippingPlanes = [this.plane];
      material.clipShadows = true;
      const object = new THREE.Mesh(g, material);
      object.userData.object = group.object;
      object.castShadow = !transparent && options.appearance !== "inspection" && options.appearance !== "flat";
      object.receiveShadow = options.appearance !== "inspection" && options.appearance !== "flat";
      this.model.add(object);
      if (!transparent) this.outlines.add(g, [this.plane]);
    }
    this.box.setFromObject(this.model);
    if (this.box.isEmpty())
      this.box.set(new THREE.Vector3(-1, -1, 0), new THREE.Vector3(1, 1, 2));
    this.plane.constant = THREE.MathUtils.lerp(
      this.box.min.z - 0.1,
      this.box.max.z + 0.1,
      options.cut,
    );
    const nav =
      options.movement === "water" ? level.waterNavigation : level.navigation;
    if (options.movement && nav) {
      const g = new THREE.BufferGeometry();
      g.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(nav.positions, 3),
      );
      g.setIndex(navigationIndices(level, nav, options.layer, options.suggestion?.navigation?.component));
      const overlay = new THREE.Mesh(
        g,
        new THREE.MeshBasicMaterial({
          color: options.movement === "water" ? "#789eab" : "#82a897",
          transparent: true,
          opacity: 0.65,
          side: THREE.DoubleSide,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -4,
          clippingPlanes: [this.plane],
        }),
      );
      this.model.add(overlay);
    }
    if (options.issues) appendTerrainScene(this.model, level, options.selected);
    if (options.issues && nav) {
      const samples = [
        ...(nav.coverage.uncovered ?? []),
        ...(nav.coverage.blocked ?? []),
      ].filter(
        (sample) =>
          !options.layer ||
          [...level.floors, ...(level.water ?? [])].some(
            (f) => f.region === sample.region && f.layer === options.layer,
          ),
      );
      if (samples.length) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(
            samples.flatMap((s) => [
              s.position[0],
              s.position[1],
              s.position[2] + 0.12,
            ]),
            3,
          ),
        );
        const markers = new THREE.Points(
          geometry,
          new THREE.PointsMaterial({
            color: "#a55047",
            size: 8,
            sizeAttenuation: false,
            depthTest: false,
            clippingPlanes: [this.plane],
          }),
        );
        this.model.add(markers);
      }
    }
    if (options.suggestion?.patches) {
      const positions = options.suggestion.patches.flatMap(polygon => polygon.flatMap((p,i)=>[...p,...polygon[(i+1)%polygon.length]]));
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
      const outline = new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:0xb45042,depthTest:false}));
      outline.renderOrder=101;
      this.model.add(outline);
    }
    if (options.suggestion) {
      const bounds = options.suggestion.bounds;
      const box = new THREE.Box3(new THREE.Vector3(...bounds.min), new THREE.Vector3(...bounds.max));
      box.expandByScalar(0.04);
      const marker = new THREE.Box3Helper(box, 0x49857b);
      const materials = Array.isArray(marker.material) ? marker.material : [marker.material];
      materials.forEach(material => { material.depthTest = false; });
      marker.renderOrder = 100;
      this.model.add(marker);
    }
    const spawn = level.document.markers.find(
      (m) => /(^|_)spawn$/.test(m.kind) && m.movement !== "water",
    )?.position;
    this.surface =
      spawn && level.navigation
        ? new NavigationSurface(level.navigation, spawn)
        : undefined;
    if (spawn) this.point = [...spawn];
    const center = this.box.getCenter(new THREE.Vector3()),
      span = this.box.getSize(new THREE.Vector3()).length();
    this.sun.position
      .copy(center)
      .add(new THREE.Vector3(span, -span, span * 2));
    this.sun.target.position.copy(center);
    Object.assign(this.sun.shadow.camera, {
      left: -span,
      right: span,
      top: span,
      bottom: -span,
      near: 0.1,
      far: span * 5,
    });
    this.sun.shadow.camera.updateProjectionMatrix();
    if (fit) this.fit();
    this.invalidate();
  }
  /** Applies a validated overview pose without changing geometry or navigation. */
  setView(options: ViewOptions) {
    if (options.roll !== undefined && !Number.isFinite(options.roll))
      throw new Error("roll must be finite degrees.");
    const roll = options.roll ?? this.getView().roll;
    this.exitWalk();
    if (options.projection) {
      const next = options.projection === "perspective" ? this.perspective : this.orthographic;
      if (next !== this.camera) {
        next.position.copy(this.camera.position);
        next.quaternion.copy(this.camera.quaternion);
        next.up.copy(this.camera.up);
        this.camera = next;
        this.controls.object = next;
      }
    }
    if (options.position) this.camera.position.fromArray(options.position);
    if (options.target) this.controls.target.fromArray(options.target);
    this.orientCamera(roll);
    if (options.fov !== undefined) this.perspective.fov = options.fov;
    if (options.viewHeight !== undefined) {
      const half = options.viewHeight / 2;
      this.orthographic.top = half;
      this.orthographic.bottom = -half;
      this.orthographic.left = -half * this.viewportAspect;
      this.orthographic.right = half * this.viewportAspect;
      this.orthographic.zoom = 1;
    }
    const distance = this.camera.position.distanceTo(this.controls.target);
    const span = this.box.getSize(new THREE.Vector3()).length();
    this.camera.far = Math.max(10000, distance + span * 3);
    this.perspective.updateProjectionMatrix();
    this.orthographic.updateProjectionMatrix();
    this.controls.update();
    this.invalidate();
  }
  /** Sets overview image-up from a Z-up reference and forward-axis roll in degrees. */
  private orientCamera(roll: number) {
    const forward = this.controls.target.clone().sub(this.camera.position).normalize();
    this.camera.up.copy(zeroRollUp(this.camera.position, this.controls.target))
      .applyAxisAngle(forward, THREE.MathUtils.degToRad(roll));
    this.camera.lookAt(this.controls.target);
  }
  /** Reports actual overview orientation after orbiting, signed half-turn roll and effective orthographic zoom. */
  getView(): ViewState {
    const forward = this.controls.target.clone().sub(this.camera.position).normalize();
    const baseline = zeroRollUp(this.camera.position, this.controls.target);
    const actualUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
    const sine = forward.dot(baseline.clone().cross(actualUp));
    const roll = THREE.MathUtils.radToDeg(Math.atan2(sine, baseline.dot(actualUp)));
    return {
      projection: this.camera === this.perspective ? "perspective" : "orthographic",
      position: this.camera.position.toArray() as V3,
      target: this.controls.target.toArray() as V3,
      fov: this.perspective.fov,
      viewHeight: (this.orthographic.top - this.orthographic.bottom) / this.orthographic.zoom,
      roll: Math.abs(roll) < 1e-10 ? 0 : roll,
    };
  }
  /** Fits every model corner in the active projection, preserving effective roll unless specified. */
  fit(direction = new THREE.Vector3(1, -1, 0.85), roll = this.getView().roll) {
    const center = this.box.getCenter(new THREE.Vector3());
    const span = Math.max(1, this.box.getSize(new THREE.Vector3()).length());
    this.camera.position
      .copy(center)
      .addScaledVector(direction.clone().normalize(), span * 2);
    this.controls.target.copy(center);
    this.orientCamera(roll);
    this.camera.updateMatrixWorld();
    const inverse = this.camera.matrixWorldInverse;
    let x = 0,
      y = 0;
    for (const a of [this.box.min.x, this.box.max.x])
      for (const b of [this.box.min.y, this.box.max.y])
        for (const c of [this.box.min.z, this.box.max.z]) {
          const p = new THREE.Vector3(a, b, c).applyMatrix4(inverse);
          x = Math.max(x, Math.abs(p.x));
          y = Math.max(y, Math.abs(p.y));
        }
    const aspect = this.viewportAspect;
    const half = Math.max(y, x / aspect, 0.5) * 1.16;
    if (this.camera === this.orthographic) {
      this.orthographic.top = half;
      this.orthographic.bottom = -half;
      this.orthographic.left = -half * aspect;
      this.orthographic.right = half * aspect;
      this.orthographic.zoom = 1;
    }
    if (this.camera === this.perspective) {
      const tangent = Math.tan(THREE.MathUtils.degToRad(this.perspective.fov / 2));
      let distance = 1;
      for (const a of [this.box.min.x, this.box.max.x])
        for (const b of [this.box.min.y, this.box.max.y])
          for (const c of [this.box.min.z, this.box.max.z]) {
            const p = new THREE.Vector3(a, b, c).sub(center);
            p.applyQuaternion(this.camera.quaternion.clone().invert());
            distance = Math.max(distance, p.z + Math.max(Math.abs(p.y) / tangent, Math.abs(p.x) / (tangent * aspect)) * 1.16);
          }
      this.camera.position.copy(center).addScaledVector(direction.clone().normalize(), distance);
    }
    this.camera.far = Math.max(100, this.camera.position.distanceTo(center) + span * 3);
    this.camera.updateProjectionMatrix();
    this.controls.update();
    this.invalidate();
  }
  /** Applies a standard inspection direction with zero image roll. */
  preset(name: string) {
    const directions: Record<string, THREE.Vector3> = {
      top: new THREE.Vector3(0, -0.001, 1),
      front: new THREE.Vector3(0, -1, 0.001),
      side: new THREE.Vector3(1, 0, 0.001),
    };
    this.fit(directions[name], 0);
  }
  /** Turns the overview around its target by ninety degrees. */
  turn() {
    const roll = this.getView().roll;
    this.camera.position
      .sub(this.controls.target)
      .applyAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2)
      .add(this.controls.target);
    this.orientCamera(roll);
    this.controls.update();
    this.invalidate();
  }
  /** Places a collision-checked inspection body without changing authored markers or navigation. */
  enterWalk(requested?: WalkPose): WalkStartResult {
    if (!this.level) return { ok: false, message: "Load a layout before walking." };
    if (this.renderer.getContext().isContextLost()) return { ok: false, message: "3D graphics are unavailable; restore the preview before walking." };
    const spawn = this.level.document.markers.find(m => /(^|_)spawn$/.test(m.kind) && m.movement !== "water");
    if (!requested && !spawn) return { ok: false, message: "No authored land spawn. Enter supported inspection feet coordinates instead." };
    const prepared = prepareInspectionWalk(this.level, requested ?? { feet: spawn!.position, yaw: 0, pitch: 0 });
    if (!prepared.ok) return prepared;
    this.surface = prepared.surface;
    this.point = [...prepared.pose.feet];
    this.yaw = THREE.MathUtils.degToRad(prepared.pose.yaw);
    this.pitch = THREE.MathUtils.degToRad(prepared.pose.pitch);
    this.keys.clear();
    this.walking = true;
    this.controls.enabled = false;
    this.clock.reset(performance.now());
    this.onWalk(true);
    this.publishWalk();
    this.renderer.domElement.focus();
    this.invalidate();
    return { ok: true, pose: prepared.pose };
  }
  /** Reports actual feet/orientation; motion remains constrained by existing eroded land navigation. */
  getWalk() {
    return {
      active: this.walking,
      feet: [...this.point] as V3,
      yaw: Number(THREE.MathUtils.radToDeg(this.yaw).toFixed(9)),
      pitch: Number(THREE.MathUtils.radToDeg(this.pitch).toFixed(9)),
      collision: "physical" as const,
      height: this.level?.navigation?.settings.player.height,
      radius: this.level?.navigation?.settings.player.radius,
    };
  }
  /** Publishes transition state even when a hidden viewport will not render another frame. */
  private publishWalk() {
    const walk = this.getWalk();
    this.host.dataset.walk = JSON.stringify(walk);
    this.host.dispatchEvent(new CustomEvent("review-walk-change", { detail: walk }));
  }
  /** Returns to the unchanged overview camera. */
  exitWalk() {
    if (!this.walking) return;
    this.walking = false;
    this.keys.clear();
    this.controls.enabled = true;
    if (document.pointerLockElement === this.renderer.domElement)
      document.exitPointerLock();
    this.onWalk(false);
    this.publishWalk();
    this.invalidate();
  }
  /** Advances navigation using actual held-input time, subdivided by NavigationSurface. */
  private advanceWalk(now: number) {
    const seconds = this.clock.consume(now);
    if (!this.walking || !this.surface) return;
    const forward =
      Number(this.keys.has("w") || this.keys.has("arrowup")) -
      Number(this.keys.has("s") || this.keys.has("arrowdown"));
    const side =
      Number(this.keys.has("d") || this.keys.has("arrowright")) -
      Number(this.keys.has("a") || this.keys.has("arrowleft"));
    const scale = (3.4 * seconds) / Math.max(1, Math.hypot(forward, side));
    this.point = this.surface.move(
      this.point,
      (Math.cos(this.yaw) * forward - Math.sin(this.yaw) * side) * scale,
      (Math.sin(this.yaw) * forward + Math.cos(this.yaw) * side) * scale,
    );
    this.host.dataset.player = this.point.join(",");
  }
  /** Renders on demand, or during active walking. */
  private render(now: number) {
    if (!this.visible || document.hidden) return;
    if (this.walking) {
      this.advanceWalk(now);
      this.walkCamera.position.set(
        this.point[0],
        this.point[1],
        this.point[2] +
          (this.level?.navigation?.settings.player.height ?? 1.7) * 0.93,
      );
      this.walkCamera.lookAt(
        this.walkCamera.position
          .clone()
          .add(
            new THREE.Vector3(
              Math.cos(this.yaw) * Math.cos(this.pitch),
              Math.sin(this.yaw) * Math.cos(this.pitch),
              Math.sin(this.pitch),
            ),
          ),
      );
    }
    if (!this.dirty && !this.walking) return;
    this.renderer.info.autoReset = false;
    this.renderer.info.reset();
    const renderCamera = this.walking ? this.walkCamera : this.camera;
    this.outlines.render(this.renderer, this.scene, renderCamera);
    this.dirty = false;
    this.frame++;
    this.host.dataset.frames = String(this.frame);
    this.host.dataset.frustum = [
      this.orthographic.left,
      this.orthographic.right,
      this.orthographic.top,
      this.orthographic.bottom,
      this.camera.near,
      this.camera.far,
    ].join(",");
    const view = this.getView();
    this.host.dataset.projection = this.walking ? "perspective" : view.projection;
    this.host.dataset.projectionMatrix = renderCamera.projectionMatrix.toArray().join(",");
    this.host.dataset.viewMatrix = renderCamera.matrixWorldInverse.toArray().join(",");
    this.host.dataset.view = JSON.stringify(view);
    this.publishWalk();
    this.host.dispatchEvent(new CustomEvent("review-view-change", { detail: view }));
    this.host.dataset.triangles = String(this.renderer.info.render.triangles);
    this.host.dataset.cut = String(this.plane.constant);
    this.host.dataset.drawCalls = String(this.renderer.info.render.calls);
    this.host.dataset.camera = [
      ...this.camera.position.toArray(),
      this.camera.zoom,
      ...this.controls.target.toArray(),
    ].join(",");
  }
  /** Releases input listeners, observers, shadows and the renderer. */
  dispose() {
    this.exitWalk();
    this.abort.abort();
    this.size.disconnect();
    this.renderer.setAnimationLoop(null);
    this.controls.dispose();
    this.clearModel();
    this.sun.shadow.dispose();
    this.disposed = true;
    this.clearTextures();
    this.outlines.dispose();
    this.renderer.dispose();
  }
}
