import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { V3 } from "../src/vector/types.ts";
import type { ViewOptions, ViewState } from "./view.ts";

/** Returns the screen-up direction of Three's canonical Z-up camera, including its pole fallback. */
function zeroRollUp(position: THREE.Vector3, target: THREE.Vector3) {
  const basis = new THREE.Matrix4().lookAt(position, target, new THREE.Vector3(0, 0, 1));
  return new THREE.Vector3(0, 1, 0).transformDirection(basis);
}

/** Owns overview projection, framing and horizontal screen-center orbit in Z-up meters. */
export class ReviewCamera {
  readonly orthographic = new THREE.OrthographicCamera(-20, 20, 20, -20, 0.01, 10000);
  private perspective = new THREE.PerspectiveCamera(55, 1, 0.01, 10000);
  camera: THREE.OrthographicCamera | THREE.PerspectiveCamera = this.orthographic;
  readonly controls: OrbitControls;
  private viewportAspect = 1;

  constructor(
    canvas: HTMLCanvasElement,
    private model: THREE.Group,
    private box: THREE.Box3,
    private plane: THREE.Plane,
    canOrbit: () => boolean,
    private invalidate: () => void,
    private exitWalk: () => void,
    signal: AbortSignal,
  ) {
    this.orthographic.up.set(0, 0, 1);
    this.perspective.up.set(0, 0, 1);
    this.controls = new OrbitControls(this.camera, canvas);
    canvas.addEventListener("pointerdown", (event) => {
      if (!canOrbit() || !event.isPrimary || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey) return;
      this.centerOrbitPivot();
    }, { capture: true, signal: signal });
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
  }

  /** Preserves vertical framing and updates both projections for the measured viewport. */
  resize(aspect: number) {
    this.viewportAspect = aspect;
    const half = (this.orthographic.top - this.orthographic.bottom) / 2;
    this.orthographic.left = -half * aspect;
    this.orthographic.right = half * aspect;
    this.orthographic.updateProjectionMatrix();
    this.perspective.aspect = aspect;
    this.perspective.updateProjectionMatrix();
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
  /** Releases OrbitControls listeners; the scene owns canvas listener cancellation. */
  dispose() {
    this.controls.dispose();
  }
}
