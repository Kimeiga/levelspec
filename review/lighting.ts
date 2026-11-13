import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { createReviewSky, SUN_COLOR, SUN_DIRECTION } from "./sky.ts";
import type { Appearance } from "./view.ts";

/** Transparent panes and reviewer overlays must not become opaque occluders in the normal pass. */
class ReviewOcclusion extends GTAOPass {
  override render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
  ) {
    const hidden: THREE.Object3D[] = [];
    this.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || !object.visible) return;
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      if (
        materials.some(
          (material) => material.transparent || !material.depthTest,
        )
      ) {
        hidden.push(object);
        object.visible = false;
      }
    });
    try {
      super.render(renderer, writeBuffer, readBuffer, 0, false);
    } finally {
      for (const object of hidden) object.visible = true;
    }
  }
}

/** Owns the real-time Ninefold lighting rig and its optional post-processing resources. */
export class ReviewLighting {
  private full = new THREE.Group();
  private basic = new THREE.HemisphereLight(0xffffff, 0xa6a6a6, Math.PI);
  private lights: {
    light: THREE.DirectionalLight;
    direction: THREE.Vector3;
  }[] = [];
  private sky?: ReturnType<typeof createReviewSky>;
  private post?: {
    composer: EffectComposer;
    render: RenderPass;
    ao: GTAOPass;
    bloom: UnrealBloomPass;
    output: OutputPass;
  };
  private appearance: Appearance = "full-render";
  private timeOfDay: "day" | "night" = "day";
  private night = new THREE.HemisphereLight(0x7185bb, 0x242332, 0.8);
  private width = 1;
  private height = 1;

  constructor(
    private renderer: THREE.WebGLRenderer,
    private scene: THREE.Scene,
    private plane: THREE.Plane,
  ) {
    this.basic.position.set(0, 0, 1);
    this.night.position.set(0, 0, 1);
    const ambient = new THREE.HemisphereLight(
      new THREE.Color(0.5, 0.58, 0.88),
      new THREE.Color(0.52, 0.42, 0.32),
      1.05,
    );
    ambient.position.set(0, 0, 1);
    this.full.add(ambient);
    this.addSun(SUN_COLOR, 4.2, SUN_DIRECTION, 4096);
    for (let i = 0; i < 3; i++) {
      const azimuth = (i / 3) * Math.PI * 2 + 0.35;
      const elevation = THREE.MathUtils.degToRad(54);
      const direction = new THREE.Vector3(
        Math.cos(azimuth) * Math.cos(elevation),
        -Math.sin(azimuth) * Math.cos(elevation),
        -Math.sin(elevation),
      );
      this.addSun(new THREE.Color(0.46, 0.6, 1), 2.6 / 3, direction, 2048);
    }
    this.scene.add(this.full, this.basic, this.night);
    this.night.visible = false;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
  }

  /** Adds a Z-up shadow caster; its frustum is fitted when visible geometry changes. */
  private addSun(
    color: THREE.Color,
    intensity: number,
    direction: THREE.Vector3,
    resolution: number,
  ) {
    const light = new THREE.DirectionalLight(color, intensity);
    light.up.set(0, 0, 1);
    light.shadow.camera.up.set(0, 0, 1);
    light.castShadow = true;
    light.shadow.mapSize.set(resolution, resolution);
    light.shadow.bias = -0.0002;
    this.lights.push({ light, direction });
    this.full.add(light, light.target);
  }

  /** Applies appearance independently of the model, camera, and authored material data. */
  setAppearance(appearance: Appearance) {
    this.appearance = appearance;
    const full = appearance === "full-render";
    this.full.visible = full;
    this.basic.visible = appearance === "materials";
    this.renderer.shadowMap.enabled = full;
    this.invalidateShadows();
    this.renderer.toneMapping = full
      ? THREE.ACESFilmicToneMapping
      : THREE.NoToneMapping;
    this.renderer.toneMappingExposure = full ? 1.15 : 1;
    if (full && !this.sky) {
      this.sky = createReviewSky(this.renderer);
      this.full.add(this.sky.backdrop);
    }
    this.scene.background = full ? null : new THREE.Color("#f7f7f7");
    this.scene.environment = full ? this.sky!.environment.texture : null;
    this.scene.environmentIntensity = 0.35;
    this.scene.fog = full
      ? new THREE.FogExp2(new THREE.Color(0.52, 0.54, 0.66), 0.0052)
      : null;
    this.setTimeOfDay(this.timeOfDay);
  }

  /** Applies authored day/night context; emissive materials remain responsible for their own glow. */
  setTimeOfDay(timeOfDay: "day" | "night") {
    this.timeOfDay = timeOfDay;
    if (this.post) this.configureBloom(this.post.bloom);
    const full = this.appearance === "full-render", dark = timeOfDay === "night";
    this.full.visible = full && !dark;
    this.night.visible = full && dark;
    if (!full) return;
    this.scene.background = dark ? new THREE.Color("#070b18") : null;
    this.scene.environment = dark ? null : this.sky!.environment.texture;
    this.scene.fog = new THREE.FogExp2(dark ? new THREE.Color("#10182d") : new THREE.Color(0.52, 0.54, 0.66), 0.0052);
    this.invalidateShadows();
  }

  /** Keeps nighttime emission legible without washing out frames and room returns. */
  private configureBloom(bloom: UnrealBloomPass) {
    const night = this.timeOfDay === "night";
    bloom.strength = night ? 0.09 : 0.28;
    bloom.radius = night ? 0.3 : 0.55;
  }

  /** Section cuts and geometry changes require fresh real-time shadow maps. */
  invalidateShadows() {
    this.renderer.shadowMap.needsUpdate = true;
  }

  /** Fits all shadow maps in light space, retaining contact precision at different level sizes. */
  fit(bounds: THREE.Box3) {
    const center = bounds.getCenter(new THREE.Vector3());
    const reach =
      Math.max(1, bounds.getSize(new THREE.Vector3()).length()) + 20;
    for (const { light, direction } of this.lights) {
      light.position.copy(center).addScaledVector(direction, -reach);
      light.target.position.copy(center);
      light.updateMatrixWorld();
      light.target.updateMatrixWorld();
      light.shadow.updateMatrices(light);
      const fit = bounds
        .clone()
        .applyMatrix4(light.shadow.camera.matrixWorldInverse);
      const size = fit.getSize(new THREE.Vector3());
      const texel = Math.max(
        size.x / light.shadow.mapSize.x,
        size.y / light.shadow.mapSize.y,
      );
      const padding = Math.max(0.01, texel * 4);
      Object.assign(light.shadow.camera, {
        left: fit.min.x - padding,
        right: fit.max.x + padding,
        bottom: fit.min.y - padding,
        top: fit.max.y + padding,
        near: Math.max(0.1, -fit.max.z - padding),
        far: -fit.min.z + padding,
      });
      light.shadow.camera.updateProjectionMatrix();
      light.shadow.normalBias = texel * 2;
    }
    this.renderer.shadowMap.needsUpdate = true;
  }

  /** Resizes output and contact AO to device pixels so thin pipes survive the depth pass. */
  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    if (!this.post) return;
    const ratio = this.renderer.getPixelRatio();
    this.post.composer.setPixelRatio(ratio);
    this.post.composer.setSize(width, height);
    this.post.ao.setSize(
      Math.max(1, Math.ceil(width * ratio)),
      Math.max(1, Math.ceil(height * ratio)),
    );
  }

  /** Lazily allocates Ninefold's HDR, contact-occlusion, bloom, and output passes. */
  private createPost(camera: THREE.Camera) {
    const target = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      samples: 4,
    });
    const composer = new EffectComposer(this.renderer, target);
    const render = new RenderPass(this.scene, camera);
    const ao = new ReviewOcclusion(this.scene, camera, 1, 1);
    ao.normalMaterial.clippingPlanes = [this.plane];
    ao.normalMaterial.side = THREE.DoubleSide;
    ao.updateGtaoMaterial({
      radius: 0.35,
      distanceExponent: 1.3,
      thickness: 0.35,
      scale: 1.5,
      samples: 16,
      distanceFallOff: 1,
      screenSpaceRadius: false,
    });
    ao.updatePdMaterial({
      lumaPhi: 10,
      depthPhi: 0.2,
      normalPhi: 3,
      radius: 2,
      rings: 2,
      samples: 8,
    });
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(1, 1),
      0.28,
      0.55,
      1.25,
    );
    this.configureBloom(bloom);
    const output = new OutputPass();
    for (const pass of [render, ao, bloom, output]) composer.addPass(pass);
    this.post = { composer, render, ao, bloom, output };
    this.resize(this.width, this.height);
  }

  /** Renders the active camera; AO excludes glass and diagnostics while honoring section clipping. */
  render(camera: THREE.Camera) {
    if (this.appearance !== "full-render") {
      this.renderer.render(this.scene, camera);
      return;
    }
    if (!this.post) this.createPost(camera);
    const { render, ao, composer } = this.post!;
    render.camera = camera;
    ao.camera = camera;
    const perspective = camera instanceof THREE.PerspectiveCamera ? 1 : 0;
    for (const material of [ao.gtaoMaterial, ao.depthRenderMaterial]) {
      if (material.defines.PERSPECTIVE_CAMERA !== perspective) {
        material.defines.PERSPECTIVE_CAMERA = perspective;
        material.needsUpdate = true;
      }
    }
    composer.render();
  }

  /** Releases GPU buffers, including resources not released by the installed GTAOPass. */
  reset() {
    if (this.post) {
      const { composer, render, ao, bloom, output } = this.post;
      render.dispose();
      ao.dispose();
      ao.gtaoMaterial.dispose();
      ao.blendMaterial.dispose();
      bloom.dispose();
      output.dispose();
      composer.dispose();
      this.post = undefined;
    }
    this.scene.environment = null;
    this.scene.background = null;
    this.sky?.background.dispose();
    this.sky?.environment.dispose();
    if (this.sky) {
      this.full.remove(this.sky.backdrop);
      this.sky.backdrop.geometry.dispose();
      this.sky.backdrop.material.dispose();
    }
    this.sky = undefined;
    for (const { light } of this.lights) {
      light.shadow.dispose();
      light.shadow.map = null;
    }
  }

  /** Disposes the lighting pipeline without disposing caller-owned scene or renderer. */
  dispose() {
    this.reset();
    this.scene.remove(this.full, this.basic, this.night);
  }
}
