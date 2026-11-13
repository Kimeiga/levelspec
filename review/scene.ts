import { appendTerrainScene } from "./terrain.ts";
import * as THREE from "three";
import { ReviewLighting } from "./lighting.ts";
import { ReviewCamera } from "./camera.ts";
import { WalkMotion, type WalkHelper } from "./walk-motion.ts";
import { bindWalkInput } from "./walk-input.ts";
import { navigationIndices } from "./navigation.ts";
import { materialTangents } from "../src/vector/tangents.ts";
import { MAX_WALK_PITCH, prepareInspectionWalk, type WalkPose, type WalkStartResult } from "./walk.ts";
import { WalkClock } from "./walk-clock.ts";
import { prepareReviewTextures, ReviewTextures } from "./material-assets.ts";
import type { CompiledLevel, ReviewFinding, V3 } from "../src/vector/types.ts";
import type { Appearance } from "./view.ts";

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

/** Owns review GPU resources and cameras, in meters and right-handed Z-up. */
export class ReviewScene {
  readonly renderer = new THREE.WebGLRenderer({ antialias: true });
  readonly overview: ReviewCamera;
  readonly scene = new THREE.Scene();
  private model = new THREE.Group();
  private lighting: ReviewLighting;
  private walkCamera = new THREE.PerspectiveCamera(65, 1, 0.08, 10000);
  private plane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 1000);
  private box = new THREE.Box3();
  private size: ResizeObserver;
  private abort = new AbortController();
  private displayKey = "";
  private textures = new ReviewTextures();
  private disposed = false;
  private frame = 0;
  private dirty = true;
  private visible = true;
  private level?: CompiledLevel;
  private motion?: WalkMotion;
  private walkHelper: WalkHelper = "off";
  private point: V3 = [0, 0, 0];
  private yaw = 0;
  private pitch = 0;
  private keys = new Set<string>();
  private clock = new WalkClock();
  private walking = false;
  private onWalk: (walking: boolean) => void;

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
    this.scene.add(this.model);
    this.lighting = new ReviewLighting(this.renderer, this.scene, this.plane);
    this.walkCamera.up.set(0, 0, 1);
    host.append(this.renderer.domElement);
    this.renderer.domElement.tabIndex = 0;
    this.renderer.domElement.setAttribute(
      "aria-label",
      "3D layout. Drag to rotate horizontally, right drag to pan, scroll to zoom.",
    );
    this.overview = new ReviewCamera(
      this.renderer.domElement, this.model, this.box, this.plane,
      () => Boolean(this.level) && !this.walking,
      () => this.invalidate(), () => this.exitWalk(), this.abort.signal,
    );
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
        this.lighting.reset();
        this.displayKey = "";
        onContext(false);
      },
      { signal: this.abort.signal },
    );
    canvas.addEventListener(
      "webglcontextrestored",
      () => {
        this.textures.restore();
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
          this.overview.camera,
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
          this.walkHelper = "off";
          this.publishWalk();
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
  /** Stages a complete decoded image set before the caller publishes its candidate level. */
  prepareAssets(level: CompiledLevel, urls: Record<string, string>, signal?: AbortSignal) {
    return prepareReviewTextures(level, urls, signal);
  }
  /** Releases scene-owned textures after model disposal. */
  private clearTextures() {
    this.textures.dispose();
    this.textures = new ReviewTextures();
  }
  /** Retrieves an already decoded image using its material slot's color space. */
  private texture(reference: string, color = true) {
    return this.textures.get(reference, color);
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
    this.renderer.setSize(width, height, false);
    this.lighting.resize(width, height);
    this.overview.resize(width / height);
    this.walkCamera.aspect = width / height;
    this.walkCamera.updateProjectionMatrix();
    this.invalidate();
  }
  /** Releases all resources belonging to the previous display, including edge buffers. */
  private clearModel() {
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
  setLevel(level: CompiledLevel, options: ReviewOptions, fit = false, textures?: ReviewTextures) {
    if (this.disposed) {
      textures?.dispose();
      return;
    }
    this.plane.constant = THREE.MathUtils.lerp(
      this.box.min.z - 0.1,
      this.box.max.z + 0.1,
      options.cut,
    );
    const displayKey = JSON.stringify({ ...options, cut: 0 });
    if (!textures && this.level === level && this.displayKey === displayKey) {
      this.lighting.invalidateShadows();
      this.invalidate();
      return;
    }
    this.lighting.setAppearance(options.appearance);
    this.lighting.setTimeOfDay(level.document.timeOfDay ?? "day");
    const pixelRatio = options.appearance === "full-render" ? Math.min(devicePixelRatio, 1.25) : Math.min(devicePixelRatio, 2);
    if (this.renderer.getPixelRatio() !== pixelRatio) {
      this.renderer.setPixelRatio(pixelRatio);
      this.resize();
    }
    this.displayKey = displayKey;
    this.exitWalk();
    this.level = level;
    this.clearModel();
    if (textures) {
      this.clearTextures();
      this.textures = textures;
    }
    const { mesh, surfaces } = level;
    const tangents = options.appearance !== "wireframe" && level.document.materials.some(material => material.normalTexture)
      ? mesh.tangents ?? materialTangents(mesh, triangle => surfaces[mesh.surfaces[triangle]].visible !== false)
      : undefined;
    const groups = new Map<
      string,
      {
        positions: number[];
        colors: number[];
        normals: number[];
        uv: number[];
        tangents: number[];
        object: string;
        material: string;
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
          colors: [],
          normals: [],
          uv: [],
          tangents: [],
          object: s.object,
          material: s.material,
        };
        groups.set(key, group);
      }
      for (const i of mesh.indices.slice(t * 3, t * 3 + 3)) {
        group.positions.push(...mesh.positions.slice(i * 3, i * 3 + 3));
        group.colors.push(...(mesh.colors?.slice(i * 3, i * 3 + 3) ?? [1, 1, 1]));
        group.normals.push(...mesh.normals.slice(i * 3, i * 3 + 3));
        group.uv.push(...mesh.uv.slice(i * 2, i * 2 + 2));
        if (tangents) group.tangents.push(...tangents.slice(i * 4, i * 4 + 4));
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
      g.setAttribute("color", new THREE.Float32BufferAttribute(group.colors, 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(group.uv, 2));
      const def = level.document.materials.find((m) => m.id === group.material);
      if (def?.normalTexture && options.appearance !== "wireframe") {
        g.setAttribute("tangent", new THREE.Float32BufferAttribute(group.tangents, 4));
      }
      const opacity = def?.opacity ?? 1;
      const transparent = opacity < 1;
      const selected = group.object === options.selected || options.suggestion?.objects.includes(group.object);
      const color = new THREE.Color(selected ? "#a4beb8" : (def?.color ?? "#dddddd"));
      // A cutout keeps its edges under multisampling and draws just ahead of the face it lies on.
      const cutout = !transparent && def?.texture !== undefined && def.alphaCutoff !== undefined;
      const authored = {
        color, vertexColors: true,
        emissive: new THREE.Color(def?.emissive ?? "#000000"), emissiveIntensity: def?.emissiveStrength ?? 1,
        alphaTest: cutout ? def.alphaCutoff! : 0, alphaToCoverage: cutout,
        polygonOffset: cutout, polygonOffsetFactor: -1, polygonOffsetUnits: -2,
        map: def?.texture && options.appearance !== "wireframe" ? this.texture(def.texture) ?? null : null,
        normalMap: def?.normalTexture && options.appearance !== "wireframe" ? this.texture(def.normalTexture, false) ?? null : null,
        normalScale: new THREE.Vector2(def?.normalScale ?? 1, def?.normalScale ?? 1),
        transparent, opacity, depthWrite: !transparent,
        side: transparent ? THREE.FrontSide : THREE.DoubleSide,
      };
      let material: THREE.Material;
      if (options.appearance === "wireframe") {
        material = new THREE.MeshBasicMaterial({ color: selected ? "#49857b" : "#536574", wireframe: true, side: THREE.DoubleSide, toneMapped: false });
      } else if (options.appearance === "materials") {
        material = new THREE.MeshLambertMaterial({ ...authored, toneMapped: false });
      } else {
        const metallicRoughnessMap = def?.metallicRoughnessTexture
          ? this.texture(def.metallicRoughnessTexture, false) ?? null : null;
        material = new THREE.MeshStandardMaterial({ ...authored,
          roughness: def?.roughness ?? 1, metalness: def?.metalness ?? 0,
          roughnessMap: metallicRoughnessMap, metalnessMap: metallicRoughnessMap,
          envMapIntensity: 0.8 });
      }
      material.clippingPlanes = [this.plane];
      material.clipShadows = true;
      const object = new THREE.Mesh(g, material);
      object.userData.object = group.object;
      object.castShadow = !transparent && !cutout && options.appearance === "full-render";
      object.receiveShadow = options.appearance === "full-render";
      this.model.add(object);
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
    this.motion = undefined;
    if (spawn) this.point = [...spawn];
    this.lighting.fit(this.box);
    if (fit) this.overview.fit();
    this.host.dataset.renderHash = "renderHash" in level && typeof level.renderHash === "string" ? level.renderHash : level.geometryHash;
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
    this.motion = new WalkMotion(this.level, prepared.pose.feet);
    this.walkHelper = "off";
    this.point = [...prepared.pose.feet];
    this.yaw = THREE.MathUtils.degToRad(prepared.pose.yaw);
    this.pitch = THREE.MathUtils.degToRad(prepared.pose.pitch);
    this.keys.clear();
    this.walking = true;
    this.overview.controls.enabled = false;
    this.clock.reset(performance.now());
    this.onWalk(true);
    this.publishWalk();
    this.renderer.domElement.focus();
    this.invalidate();
    return { ok: true, pose: prepared.pose };
  }
  /** Selects repeat-jump or held-crouch inspection; exits and focus loss clear it. */
  setWalkHelper(helper: WalkHelper): void {
    if (!["off", "jump", "crouch"].includes(helper)) throw new Error("Unknown walking helper.");
    if (!this.walking) return;
    this.advanceWalk(performance.now());
    this.walkHelper = helper;
    this.invalidate();
  }
  /** Reports actual feet/orientation; motion remains constrained by existing eroded land navigation. */
  getWalk() {
    const motion = this.motion?.state;
    return {
      active: this.walking,
      feet: motion?.feet ?? [...this.point] as V3,
      eye: motion?.eye,
      stance: motion?.stance ?? "standing",
      grounded: motion?.grounded ?? true,
      verticalSpeed: motion?.verticalSpeed ?? 0,
      helper: this.walkHelper,
      yaw: Number(THREE.MathUtils.radToDeg(this.yaw).toFixed(9)),
      pitch: Number(THREE.MathUtils.radToDeg(this.pitch).toFixed(9)),
      collision: "physical" as const,
      height: motion?.height ?? this.level?.navigation?.settings.player.height,
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
    this.walkHelper = "off";
    this.keys.clear();
    this.overview.controls.enabled = true;
    if (document.pointerLockElement === this.renderer.domElement)
      document.exitPointerLock();
    this.onWalk(false);
    this.publishWalk();
    this.invalidate();
  }
  /** Advances navigation using actual held-input time, subdivided by NavigationSurface. */
  private advanceWalk(now: number) {
    const seconds = this.clock.consume(now);
    if (!this.walking || !this.motion) return;
    const forward =
      Number(this.keys.has("w") || this.keys.has("arrowup")) -
      Number(this.keys.has("s") || this.keys.has("arrowdown"));
    const side =
      Number(this.keys.has("d") || this.keys.has("arrowright")) -
      Number(this.keys.has("a") || this.keys.has("arrowleft"));
    this.motion.advance({ forward, right: side, yaw: this.yaw,
      jump: this.keys.has(" "), crouch: this.keys.has("control") || this.keys.has("c"),
    }, seconds, this.walkHelper);
    this.point = this.motion.state.feet;
    this.host.dataset.player = this.point.join(",");
  }
  /** Renders on demand, or during active walking. */
  private render(now: number) {
    if (!this.visible || document.hidden) return;
    if (this.walking) {
      this.advanceWalk(now);
      const eye = this.motion!.state.eye;
      this.walkCamera.position.set(...eye);
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
    const renderCamera = this.walking ? this.walkCamera : this.overview.camera;
    this.lighting.render(renderCamera);
    this.dirty = false;
    this.frame++;
    this.host.dataset.frames = String(this.frame);
    this.host.dataset.frustum = [
      this.overview.orthographic.left,
      this.overview.orthographic.right,
      this.overview.orthographic.top,
      this.overview.orthographic.bottom,
      this.overview.camera.near,
      this.overview.camera.far,
    ].join(",");
    const view = this.overview.getView();
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
      ...this.overview.camera.position.toArray(),
      this.overview.camera.zoom,
      ...this.overview.controls.target.toArray(),
    ].join(",");
  }
  /** Releases input listeners, observers, shadows and the renderer. */
  dispose() {
    this.exitWalk();
    this.abort.abort();
    this.size.disconnect();
    this.renderer.setAnimationLoop(null);
    this.overview.dispose();
    this.clearModel();
    this.disposed = true;
    this.clearTextures();
    this.lighting.dispose();
    this.renderer.dispose();
  }
}
