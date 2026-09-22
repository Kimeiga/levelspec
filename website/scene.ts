import { makeEnvironment } from "./environment.ts";
import { treatments } from "./world-styles.ts";
import { bindWalkInput } from "./walk-input.ts";
import { materialURLs } from "./materials.ts";
import { overviewFrame } from "./framing.ts";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { CompiledLevel, V3 } from "../src/vector/types.ts";
import { NavigationSurface } from "./navigation.ts";
type View = "courtyard" | "terrace" | "overview";
/** One GPU scene. Walk positions are constrained to compiler-derived navigation. */
export class LevelScene {
  private renderer: THREE.WebGLRenderer;
  private environment?: THREE.WebGLRenderTarget;
  private environmentStyle = "";
  private renderedFrames = 0;
  private textureBank = new Map<string, THREE.Texture>();
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(64, 1, 0.12, 160);
  private controls: OrbitControls;
  private model = new THREE.Group();
  private overlays = new THREE.Group();
  private geometry: THREE.BufferGeometry[] = [];
  private materials: THREE.Material[] = [];
  private level?: CompiledLevel;
  private surface?: NavigationSurface;
  private navigation = false;
  private walking = false;
  private busy = false;
  private point: V3 = [2, 2, 0];
  private yaw = 0.35;
  private pitch = 0;
  private keys = new Set<string>();
  private touch = { forward: 0, side: 0 };
  private dirty = true;
  private visible = true;
  private last = performance.now();
  private currentView: View = "courtyard";
  private tourIndex = -1;
  private tourAt = 0;
  private abort = new AbortController();
  private size: ResizeObserver;
  private visibility: IntersectionObserver;
  private ground: THREE.Mesh;
  private walkInput?: ReturnType<typeof bindWalkInput>;
  private savedWalk?: { point: V3; yaw: number; pitch: number };
  private accentLights = new THREE.Group();
  constructor(
    private host: HTMLElement,
    onFailure: () => void,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "low-power",
    });
    this.renderer.setPixelRatio(
      Math.min(
        devicePixelRatio || 1,
        matchMedia("(max-width:700px)").matches ? 1.5 : 2,
      ),
    );
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    // A single MSAA forward pass. No low-resolution screen-space AO that crawls during motion.
    this.renderer.shadowMap.autoUpdate = false;
    this.host.dataset.textures = "loading";
    const loader = new THREE.TextureLoader();
    Promise.all(
      Object.entries(materialURLs).map(async ([ref, url]) => {
        const texture = await loader.loadAsync(url);
        if (this.abort.signal.aborted) {
          texture.dispose();
          return;
        }
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.anisotropy = Math.min(
          8,
          this.renderer.capabilities.getMaxAnisotropy(),
        );
        this.textureBank.set(ref, texture);
      }),
    )
      .then(() => {
        if (!this.abort.signal.aborted) {
          this.host.dataset.textures = "ready";
          this.renderLevel();
        }
      })
      .catch(() => {
        this.host.dataset.textures = "error";
        this.dirty = true;
      });
    const canvas = this.renderer.domElement;
    canvas.tabIndex = 0;
    canvas.setAttribute("role", "img");
    canvas.setAttribute(
      "aria-label",
      "Interactive Lantern Court. Drag to look around. Enter the level for WASD or on-screen walking. Escape leaves walking.",
    );
    canvas.addEventListener(
      "webglcontextlost",
      (e) => {
        e.preventDefault();
        onFailure();
      },
      { signal: this.abort.signal },
    );
    host.append(canvas);
    this.camera.up.set(0, 0, 1);
    this.scene.background = new THREE.Color("#c9d6ce");
    this.scene.fog = new THREE.Fog("#c9d6ce", 65, 155);
    this.scene.add(this.model, this.overlays, this.accentLights);
    const sky = new THREE.HemisphereLight("#dcecff", "#ac8e6a", 1.15);
    sky.position.set(0, 0, 40);
    this.scene.add(sky);
    const sun = new THREE.DirectionalLight("#fff4db", 2.8);
    sun.position.set(-18, -24, 28);
    sun.target.position.set(13, 4, 0);
    sun.castShadow = true;
    sun.shadow.mapSize.set(3072, 3072);
    Object.assign(sun.shadow.camera, {
      left: -42,
      right: 42,
      top: 38,
      bottom: -38,
      near: 1,
      far: 90,
    });
    sun.shadow.normalBias = 0.04;
    sun.shadow.bias = -0.00005;
    this.scene.add(sun, sun.target);
    this.ground = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      new THREE.MeshStandardMaterial({ color: "#caba9a", roughness: 1 }),
    );
    this.ground.position.z = -0.24;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = false;
    this.controls.enablePan = false;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 65;
    this.controls.minPolarAngle = 0.1;
    this.controls.maxPolarAngle = Math.PI - 0.02;
    this.controls.addEventListener("change", () => {
      this.dirty = true;
    });
    this.controls.addEventListener("start", () => {
      this.stopTour();
    });
    canvas.addEventListener(
      "wheel",
      (e) => {
        if (!canvas.matches(":focus") || this.walking)
          e.stopImmediatePropagation();
      },
      { capture: true, passive: true, signal: this.abort.signal },
    );
    this.bindInput(canvas);
    this.size = new ResizeObserver(() => this.resize());
    this.size.observe(host);
    this.visibility = new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting;
      this.dirty = true;
      this.keys.clear();
      this.touch = { forward: 0, side: 0 };
    });
    this.visibility.observe(host);
    document.addEventListener(
      "visibilitychange",
      () => {
        this.keys.clear();
        this.touch = { forward: 0, side: 0 };
        this.stopTour();
        this.dirty = true;
      },
      { signal: this.abort.signal },
    );
    this.renderer.setAnimationLoop(() => this.frame());
    this.view("courtyard");
  }
  private bindInput(canvas: HTMLCanvasElement) {
    this.walkInput = bindWalkInput(
      canvas,
      {
        walking: () => this.walking,
        look: (dx, dy) => {
          this.yaw -= dx * 0.003;
          this.pitch = THREE.MathUtils.clamp(
            this.pitch - dy * 0.003,
            -1.1,
            1.1,
          );
          this.updateEyes();
        },
        key: (key, down) => {
          if (down) this.keys.add(key);
          else this.keys.delete(key);
        },
        clear: () => {
          this.keys.clear();
          this.touch = { forward: 0, side: 0 };
        },
        exit: () => this.exitWalk(),
        mouseMode: (captured) => {
          this.host.dataset.mouse = captured ? "captured" : "drag";
          this.host.dispatchEvent(
            new CustomEvent("mouse-mode", { detail: captured }),
          );
        },
      },
      this.abort.signal,
    );
    canvas.addEventListener(
      "keydown",
      (e) => {
        if (this.walking) return;
        if (e.key === "+" || e.key === "=") {
          e.preventDefault();
          this.zoom(1.15);
        }
        if (e.key === "-") {
          e.preventDefault();
          this.zoom(1 / 1.15);
        }
        if (e.key.toLowerCase() === "r") this.reset();
      },
      { signal: this.abort.signal },
    );
  }
  captureMouse() {
    return this.walkInput?.captureMouse() ?? Promise.resolve(false);
  }
  private resize() {
    const { width, height } = this.host.getBoundingClientRect();
    if (!width || !height) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    if (this.currentView === "overview" && !this.walking) this.overviewPose();
    this.dirty = true;
  }
  private height() {
    return (
      this.level?.document.markers.find((m) => m.id === "objective")
        ?.position[2] ?? 3
    );
  }
  private pose(at: V3, target: V3) {
    this.camera.position.set(...at);
    this.controls.target.set(...target);
    this.camera.lookAt(...target);
    this.controls.update();
    this.dirty = true;
  }
  private overviewPose() {
    const f = overviewFrame(this.model, this.camera);
    this.pose(f.position.toArray() as V3, f.target.toArray() as V3);
  }

  view(view: View) {
    this.stopTour();
    this.walking = false;
    this.walkInput?.releaseMouse();
    this.keys.clear();
    this.touch = { forward: 0, side: 0 };
    this.currentView = view;
    this.controls.enabled = true;
    if (view === "overview") this.overviewPose();
    else if (view === "terrace")
      this.pose(
        [25.5, 7.4, this.height() + 1.65],
        [3, 12, this.height() * 0.6],
      );
    else this.pose([1.7, 0.7, 1.7], [15, 11, 3.2]);
    this.host.dataset.mode = view;
    this.host.dispatchEvent(new CustomEvent("scene-mode", { detail: view }));
    this.resize();
  }
  reset() {
    this.savedWalk = undefined;
    this.view("overview");
  }
  zoom(factor: number) {
    if (this.walking) return;
    const direction = this.camera.position.clone().sub(this.controls.target);
    direction.multiplyScalar(1 / factor);
    if (direction.length() < 2) direction.setLength(2);
    if (direction.length() > 65) direction.setLength(65);
    this.camera.position.copy(this.controls.target).add(direction);
    this.controls.update();
    this.dirty = true;
  }
  enterWalk(): boolean {
    if (this.busy || !this.surface) return false;
    const saved = this.currentView === "overview" ? this.savedWalk : undefined;
    const start =
      saved?.point ??
      (this.currentView === "terrace"
        ? ([25, 7.4, this.height()] as V3)
        : ([2, 2, 0] as V3));
    const hit = this.surface.locate(start) ?? this.surface.locate([2, 2, 0]);
    if (!hit) return false;
    this.stopTour();
    this.walking = true;
    this.controls.enabled = false;
    this.point = hit.point;
    this.yaw = saved?.yaw ?? (this.currentView === "terrace" ? -2.85 : 0.35);
    this.pitch = saved?.pitch ?? 0;
    this.host.dataset.mode = "walk";
    this.host.dispatchEvent(new CustomEvent("scene-mode", { detail: "walk" }));
    this.updateEyes();
    this.renderer.domElement.focus({ preventScroll: true });
    return true;
  }
  exitWalk() {
    if (this.walking)
      this.savedWalk = {
        point: [...this.point],
        yaw: this.yaw,
        pitch: this.pitch,
      };
    this.view("overview");
  }
  isWalking() {
    return this.walking;
  }
  setBusy(value: boolean) {
    this.busy = value;
    if (value) {
      this.keys.clear();
      this.touch = { forward: 0, side: 0 };
      // Pause input, but do not silently remove first-person mode on a rebuild.
      this.stopTour();
    }
  }
  moveInput(forward: number, side: number) {
    this.touch = { forward, side };
  }
  private updateEyes() {
    this.camera.position.set(
      this.point[0],
      this.point[1],
      this.point[2] + 1.62,
    );
    const direction = new THREE.Vector3(
      Math.cos(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
    );
    this.camera.lookAt(this.camera.position.clone().add(direction));
    this.dirty = true;
    this.host.dataset.player = this.point.map((n) => n.toFixed(3)).join(",");
    this.host.dispatchEvent(
      new CustomEvent("player-position", { detail: this.point }),
    );
  }
  tour() {
    if (this.tourIndex >= 0) {
      this.stopTour();
      return;
    }
    if (matchMedia("(prefers-reduced-motion:reduce)").matches) {
      this.view("terrace");
      return;
    }
    this.view("courtyard");
    this.tourIndex = 0;
    this.tourAt = performance.now() + 4200;
    this.host.dispatchEvent(new CustomEvent("tour-change", { detail: true }));
  }
  private stopTour() {
    if (this.tourIndex < 0) return;
    this.tourIndex = -1;
    this.host.dispatchEvent(new CustomEvent("tour-change", { detail: false }));
  }
  private frame() {
    const now = performance.now(),
      dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (!this.visible || document.hidden) return;
    if (this.tourIndex >= 0 && now > this.tourAt) {
      const next = this.tourIndex + 1;
      if (next > 2) {
        this.stopTour();
      } else {
        this.view(next === 1 ? "terrace" : "overview");
        this.tourIndex = next;
        this.tourAt = now + 4200;
        this.host.dispatchEvent(
          new CustomEvent("tour-change", { detail: true }),
        );
      }
    }
    if (this.walking && this.surface && !this.busy) {
      let forward =
        this.touch.forward +
        (this.keys.has("w") || this.keys.has("arrowup") ? 1 : 0) -
        (this.keys.has("s") || this.keys.has("arrowdown") ? 1 : 0);
      let side =
        this.touch.side +
        (this.keys.has("d") || this.keys.has("arrowright") ? 1 : 0) -
        (this.keys.has("a") || this.keys.has("arrowleft") ? 1 : 0);
      const magnitude = Math.hypot(forward, side);
      if (magnitude) {
        forward /= Math.max(1, magnitude);
        side /= Math.max(1, magnitude);
        const speed = 3.4 * dt;
        this.point = this.surface.move(
          this.point,
          (Math.cos(this.yaw) * forward + Math.sin(this.yaw) * side) * speed,
          (Math.sin(this.yaw) * forward - Math.cos(this.yaw) * side) * speed,
        );
        this.updateEyes();
      }
    }
    if (this.dirty) {
      this.renderer.render(this.scene, this.camera);
      this.host.dataset.frame = String(++this.renderedFrames);
      this.dirty = false;
    }
  }
  private clear() {
    for (const group of [this.model, this.overlays]) group.clear();
    for (const g of this.geometry) g.dispose();
    for (const m of this.materials) m.dispose();
    this.geometry = [];
    this.materials = [];
  }
  setLevel(level: CompiledLevel) {
    const previousHeight = this.height(),
      wasWalking = this.walking;
    const upstairs = this.point[2] > previousHeight - 0.2;
    this.level = level;
    const style =
      treatments[
        level.document.id === "chalk-cloister"
          ? "chalk"
          : level.document.id === "slate-atelier"
            ? "night"
            : "clay"
      ];
    if (this.environmentStyle !== level.document.id) {
      const environment = makeEnvironment(
        this.renderer,
        style.sky,
        style.ground,
      );
      this.scene.environment = environment.texture;
      this.environment?.dispose();
      this.environment = environment;
      this.environmentStyle = level.document.id;
    }
    this.scene.background = new THREE.Color(style.sky);
    this.scene.fog = new THREE.Fog(style.sky, 65, 155);
    (this.ground.material as THREE.MeshStandardMaterial).color.set(
      style.ground,
    );
    this.renderer.toneMappingExposure = style.exposure;
    this.accentLights.clear();
    for (const child of this.scene.children) {
      if (child instanceof THREE.HemisphereLight) {
        child.color.set(style.hemisphere);
        child.groundColor.set(style.bounce);
        child.intensity = style.fill;
      }
      if (child instanceof THREE.DirectionalLight) {
        child.color.set(style.sunColor);
        child.intensity = style.sunIntensity;
        child.position.set(...style.sunPosition);
      }
    }
    for (const light of level.document.lights.filter(
      (l) => l.kind === "point",
    )) {
      const source = new THREE.PointLight(light.color, light.intensity, 7, 2);
      source.position.set(...light.position);
      this.accentLights.add(source);
    }
    const spawn = level.document.markers.find((m) => m.id === "spawn")
      ?.position ?? [2, 2, 0];
    this.surface = level.navigation
      ? new NavigationSurface(level.navigation, spawn)
      : undefined;
    this.renderLevel();
    if (wasWalking) {
      const candidate: [number, number, number] = [
        this.point[0],
        this.point[1],
        this.point[2] + (upstairs ? this.height() - previousHeight : 0),
      ];
      const hit =
        this.surface?.locate(candidate) ?? this.surface?.locate(spawn);
      if (hit && level.navigation?.passed) {
        this.point = hit.point;
        this.updateEyes();
      } else {
        this.exitWalk();
        this.host.dispatchEvent(new CustomEvent("walk-interrupted"));
      }
    } else this.view(this.currentView);
  }
  setNavigation(value: boolean) {
    if (this.walking) value = false;
    if (this.navigation === value) return;
    this.navigation = value;
    this.renderLevel();
  }
  private ownGeometry<T extends THREE.BufferGeometry>(g: T): T {
    this.geometry.push(g);
    return g;
  }
  private ownMaterial<T extends THREE.Material>(m: T): T {
    this.materials.push(m);
    return m;
  }
  private renderLevel() {
    if (!this.level) return;
    this.clear();
    const { mesh, surfaces, document, curves, navigation } = this.level;
    const groups = new Map<
      string,
      {
        positions: number[];
        normals: number[];
        uv: number[];
        wall: boolean;
        material: string;
        gate: boolean;
      }
    >();
    for (let t = 0; t < mesh.surfaces.length; t++) {
      const s = surfaces[mesh.surfaces[t]],
        wall = s.kind === "wall" || s.kind === "ceiling" || s.role === "roof",
        gate = s.object === "east.door" || s.object === "east.stairs",
        key = `${s.material}:${wall}:${gate}`;
      let part = groups.get(key);
      if (!part) {
        part = {
          positions: [],
          normals: [],
          uv: [],
          wall,
          material: s.material,
          gate,
        };
        groups.set(key, part);
      }
      for (let j = 0; j < 3; j++) {
        const i = mesh.indices[t * 3 + j];
        part.positions.push(...mesh.positions.slice(i * 3, i * 3 + 3));
        part.normals.push(...mesh.normals.slice(i * 3, i * 3 + 3));
        part.uv.push(...mesh.uv.slice(i * 2, i * 2 + 2));
      }
    }
    for (const part of groups.values()) {
      const def = document.materials.find((m) => m.id === part.material);
      const g = this.ownGeometry(new THREE.BufferGeometry());
      g.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(part.positions, 3),
      );
      g.setAttribute(
        "normal",
        new THREE.Float32BufferAttribute(part.normals, 3),
      );
      g.setAttribute("uv", new THREE.Float32BufferAttribute(part.uv, 2));
      const faded = this.navigation && part.wall && !part.gate;
      const m = this.ownMaterial(
        new THREE.MeshStandardMaterial({
          color: def?.color ?? "#c6ac89",
          map: def?.texture ? this.textureBank.get(def.texture) : undefined,
          roughness: def?.roughness ?? 0.85,
          emissive: def?.id === "lamp" ? "#d88739" : "#000000",
          emissiveIntensity: def?.id === "lamp" ? 0.25 : 0,
          metalness: def?.metalness ?? 0,
          transparent: faded,
          opacity: faded ? 0.12 : 1,
          depthWrite: !faded,
        }),
      );
      const object = new THREE.Mesh(g, m);
      object.castShadow = !faded;
      object.receiveShadow = !faded;
      this.model.add(object);
    }
    const curve = curves["courtyard.e0"];
    if (curve && !this.navigation) {
      const z =
        document.layers[0].edges.find((e) => e.id === "courtyard.e0")?.height ??
        1.1;
      const g = this.ownGeometry(
        new THREE.BufferGeometry().setFromPoints(
          curve.map((p) => new THREE.Vector3(p[0], p[1], p[2] + z + 0.015)),
        ),
      );
      const m = this.ownMaterial(
        new THREE.LineBasicMaterial({ color: "#ffce6b" }),
      );
      this.overlays.add(new THREE.Line(g, m));
    }
    if (this.navigation && navigation && this.surface) {
      const positions: number[] = [],
        colors: number[] = [];
      const yes = new THREE.Color("#167f6d"),
        no = new THREE.Color("#b93f36");
      for (let t = 0; t < this.surface.triangles.length; t++) {
        const color = this.surface.reachable.has(t) ? yes : no;
        for (const p of this.surface.triangles[t].p) {
          positions.push(p[0], p[1], p[2] + 0.035);
          colors.push(color.r, color.g, color.b);
        }
      }
      const g = this.ownGeometry(new THREE.BufferGeometry());
      g.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3),
      );
      g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      const m = this.ownMaterial(
        new THREE.MeshBasicMaterial({
          vertexColors: true,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.86,
          depthTest: false,
          depthWrite: false,
        }),
      );
      const n = new THREE.Mesh(g, m);
      n.renderOrder = 2;
      this.overlays.add(n);
      for (const marker of document.markers) {
        const color =
          marker.id === "spawn"
            ? "#fcf5dd"
            : navigation.unreachableMarkers.includes(marker.id)
              ? "#b52d27"
              : "#e9b255";
        const g = this.ownGeometry(
          new THREE.CylinderGeometry(0.18, 0.3, 1.1, 16),
        );
        g.rotateX(Math.PI / 2);
        const m = this.ownMaterial(
          new THREE.MeshBasicMaterial({ color, depthTest: false }),
        );
        const pin = new THREE.Mesh(g, m);
        pin.position.set(
          marker.position[0],
          marker.position[1],
          marker.position[2] + 0.7,
        );
        pin.renderOrder = 3;
        this.overlays.add(pin);
      }
    }
    this.renderer.shadowMap.needsUpdate = true;
    this.dirty = true;
  }
  dispose() {
    this.walking = false;
    this.walkInput?.releaseMouse();
    this.stopTour();
    this.abort.abort();
    this.size.disconnect();
    this.visibility.disconnect();
    this.controls.dispose();
    this.renderer.setAnimationLoop(null);
    this.clear();
    this.ground.geometry.dispose();
    (this.ground.material as THREE.Material).dispose();
    for (const object of this.scene.children)
      if (object instanceof THREE.DirectionalLight) object.shadow.dispose();
    for (const t of this.textureBank.values()) t.dispose();
    this.environment?.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
