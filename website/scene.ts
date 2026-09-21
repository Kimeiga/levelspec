import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { CompiledLevel } from "../src/vector/types.ts";

/** One scene owns the spatial preview; the plan is a separate, accessible SVG. */
export class LevelScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private model = new THREE.Group();
  private camera = new THREE.OrthographicCamera(-20, 20, 16, -16, 0.1, 300);
  private controls: OrbitControls;
  private size: ResizeObserver;
  private visibility: IntersectionObserver;
  private visible = true;
  private dirty = true;
  private level?: CompiledLevel;
  private navigation = false;
  private outline = new THREE.Group();
  private onVisibility = () => {
    this.dirty = true;
  };
  constructor(
    private host: HTMLElement,
    onFailure: () => void,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const canvas = this.renderer.domElement;
    canvas.tabIndex = 0;
    canvas.setAttribute("role", "img");
    canvas.setAttribute(
      "aria-label",
      "3D courtyard. Drag to orbit. Plus and minus zoom. R resets the camera. The same layout is shown in the adjacent floor plan.",
    );
    canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      onFailure();
    });
    host.append(canvas);
    this.camera.up.set(0, 0, 1);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = false;
    this.controls.enablePan = false;
    // Do not capture page scrolling. Explicit zoom buttons and pinch remain available.
    this.controls.enableZoom = true;
    this.controls.zoomToCursor = false;
    this.controls.minZoom = 0.65;
    this.controls.maxZoom = 2.6;
    this.controls.minPolarAngle = 0.08;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.06;
    this.controls.addEventListener("change", () => {
      this.dirty = true;
    });
    canvas.addEventListener(
      "wheel",
      (event) => {
        if (!canvas.matches(":focus")) event.stopImmediatePropagation();
      },
      { capture: true, passive: true },
    );
    canvas.addEventListener("keydown", (event) => {
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        this.zoom(1.15);
      }
      if (event.key === "-") {
        event.preventDefault();
        this.zoom(1 / 1.15);
      }
      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        this.reset();
      }
    });
    this.scene.add(this.model, this.outline);
    const hemisphere = new THREE.HemisphereLight("#fffaf0", "#809590", 2.2);
    hemisphere.position.set(0, 0, 30);
    this.scene.add(hemisphere);
    const sun = new THREE.DirectionalLight("#fff6e8", 3.2);
    sun.position.set(-12, -18, 32);
    sun.target.position.set(12, 4, 0);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, {
      left: -28,
      right: 28,
      top: 25,
      bottom: -25,
      near: 1,
      far: 100,
    });
    sun.shadow.normalBias = 0.035;
    this.scene.add(sun, sun.target);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(140, 140),
      new THREE.ShadowMaterial({ opacity: 0.09 }),
    );
    ground.position.z = -0.23;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.size = new ResizeObserver(() => this.resize());
    this.size.observe(host);
    this.visibility = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      this.dirty = true;
    });
    this.visibility.observe(host);
    document.addEventListener("visibilitychange", this.onVisibility);
    this.renderer.setAnimationLoop(() => {
      if (!this.visible || document.hidden || !this.dirty) return;
      this.renderer.render(this.scene, this.camera);
      this.dirty = false;
    });
    this.reset();
  }
  private resize() {
    const { width, height } = this.host.getBoundingClientRect();
    if (!width || !height) return;
    this.renderer.setSize(width, height, false);
    const aspect = width / height;
    const vertical = Math.max(11, 17 / aspect);
    this.camera.left = -vertical * aspect;
    this.camera.right = vertical * aspect;
    this.camera.top = vertical;
    this.camera.bottom = -vertical;
    this.camera.updateProjectionMatrix();
    this.dirty = true;
  }
  reset() {
    this.controls.target.set(13, 3, 0.6);
    this.camera.position.set(39, -37, 39);
    this.camera.zoom = 1;
    this.camera.updateProjectionMatrix();
    this.controls.update();
    this.resize();
    this.dirty = true;
  }
  zoom(factor: number) {
    this.camera.zoom = THREE.MathUtils.clamp(
      this.camera.zoom * factor,
      0.65,
      2.6,
    );
    this.camera.updateProjectionMatrix();
    this.dirty = true;
  }
  private clear(group: THREE.Group) {
    for (const object of [...group.children]) {
      group.remove(object);
      if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        materials.forEach((material) => material.dispose());
      }
    }
  }
  setLevel(level: CompiledLevel) {
    this.level = level;
    this.renderLevel();
  }
  setNavigation(value: boolean) {
    if (this.navigation === value) return;
    this.navigation = value;
    this.renderLevel();
  }
  private renderLevel() {
    if (!this.level) return;
    this.clear(this.model);
    this.clear(this.outline);
    const { mesh, surfaces, document, curves, navigation } = this.level;
    const grouped = new Map<
      string,
      { positions: number[]; normals: number[]; wall: boolean }
    >();
    for (let triangle = 0; triangle < mesh.surfaces.length; triangle++) {
      const surface = surfaces[mesh.surfaces[triangle]];
      const wall = surface.kind === "wall";
      const key = `${surface.material}:${wall}`;
      let part = grouped.get(key);
      if (!part) {
        part = { positions: [], normals: [], wall };
        grouped.set(key, part);
      }
      for (let corner = 0; corner < 3; corner++) {
        const index = mesh.indices[triangle * 3 + corner];
        part.positions.push(...mesh.positions.slice(index * 3, index * 3 + 3));
        part.normals.push(...mesh.normals.slice(index * 3, index * 3 + 3));
      }
    }
    for (const [key, part] of grouped) {
      const definition = document.materials.find(
        (material) => material.id === key.split(":")[0],
      );
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(part.positions, 3),
      );
      geometry.setAttribute(
        "normal",
        new THREE.Float32BufferAttribute(part.normals, 3),
      );
      const transparent = this.navigation && part.wall;
      const material = new THREE.MeshStandardMaterial({
        color: definition?.color ?? "#b9c7d1",
        roughness: definition?.roughness ?? 0.85,
        metalness: definition?.metalness ?? 0,
        transparent,
        opacity: transparent ? 0.22 : 1,
        depthWrite: !transparent,
      });
      const object = new THREE.Mesh(geometry, material);
      object.castShadow = !transparent;
      object.receiveShadow = !transparent;
      this.model.add(object);
    }
    const curve = curves["courtyard.e0"];
    if (curve && !this.navigation) {
      const points = curve.map(
        (point) =>
          new THREE.Vector3(
            point[0],
            point[1],
            point[2] + document.wallHeight + 0.025,
          ),
      );
      const path = new THREE.BufferGeometry().setFromPoints(points);
      this.outline.add(
        new THREE.Line(
          path,
          new THREE.LineBasicMaterial({ color: "#d95332", linewidth: 2 }),
        ),
      );
    }
    if (this.navigation && navigation) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(navigation.positions, 3),
      );
      geometry.setIndex(navigation.indices);
      const material = new THREE.MeshBasicMaterial({
        color: "#16816e",
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        depthTest: false,
        depthWrite: false,
      });
      const object = new THREE.Mesh(geometry, material);
      object.renderOrder = 2;
      this.model.add(object);
    }
    this.dirty = true;
  }
  dispose() {
    this.renderer.setAnimationLoop(null);
    this.controls.dispose();
    this.size.disconnect();
    this.visibility.disconnect();
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
        object.geometry.dispose();
        (Array.isArray(object.material)
          ? object.material
          : [object.material]
        ).forEach((material) => material.dispose());
      }
    });
    this.renderer.dispose();
  }
}
