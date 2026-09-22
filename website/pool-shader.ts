import * as THREE from "three";
/** Reflect the actual courtyard. Replaces its authored basin top, never overlays a duplicate face. */
export class PoolSurface extends THREE.Mesh<
  THREE.BufferGeometry,
  THREE.ShaderMaterial
> {
  private target: THREE.WebGLRenderTarget;
  private mirror = new THREE.PerspectiveCamera();
  private reflectionMatrix = new THREE.Matrix4();
  constructor(worldGeometry: THREE.BufferGeometry, resolution = 384) {
    worldGeometry.computeBoundingBox();
    const box = worldGeometry.boundingBox!;
    const center = box.getCenter(new THREE.Vector3());
    worldGeometry.translate(-center.x, -center.y, -center.z);
    const target = new THREE.WebGLRenderTarget(resolution, resolution, {
      type: THREE.HalfFloatType,
      depthBuffer: true,
    });
    const material = new THREE.ShaderMaterial({
      uniforms: {
        reflection: { value: target.texture },
        reflectionMatrix: { value: new THREE.Matrix4() },
        time: { value: 0 },
        tint: { value: new THREE.Color("#247f73") },
      },
      vertexShader: `varying vec4 vMirror; varying vec3 vWorld; uniform mat4 reflectionMatrix;
    void main(){vec4 p=modelMatrix*vec4(position,1.);vWorld=p.xyz;vMirror=reflectionMatrix*p;gl_Position=projectionMatrix*viewMatrix*p;}`,
      fragmentShader: `uniform sampler2D reflection; uniform float time; uniform vec3 tint; varying vec4 vMirror; varying vec3 vWorld;
    #include <common>
    void main(){
     vec2 p=vWorld.xy;float a=p.x*3.2+p.y*2.3+time*.65;float b=p.x*1.6-p.y*3.7-time*.43;
     vec3 n=normalize(vec3(.022*cos(a)+.014*cos(b),.016*cos(a)-.019*cos(b),1.));
     vec3 eye=normalize(cameraPosition-vWorld);float fresnel=.035+.965*pow(1.-max(dot(eye,n),0.),5.);
     vec2 uv=vMirror.xy/vMirror.w+n.xy*.017;vec3 reflected=texture2D(reflection,clamp(uv,vec2(.002),vec2(.998))).rgb;
     vec3 light=mix(tint*.34,reflected,clamp(fresnel+.24,.0,.95));
     gl_FragColor=vec4(light,1.);
     #include <tonemapping_fragment>
     #include <colorspace_fragment>
    }`,
    });
    super(worldGeometry, material);
    this.target = target;
    this.position.copy(center);
    this.reflectionMatrix = material.uniforms.reflectionMatrix.value;
    this.onBeforeRender = (renderer, scene, camera) =>
      this.capture(renderer, scene, camera as THREE.PerspectiveCamera);
  }
  private capture(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
  ) {
    const z = this.position.z;
    if (camera.position.z <= z + 0.01) return;
    const normal = new THREE.Vector3(0, 0, 1),
      eye = camera.getWorldPosition(new THREE.Vector3()),
      direction = camera.getWorldDirection(new THREE.Vector3());
    this.mirror.position.copy(eye);
    this.mirror.position.z = 2 * z - eye.z;
    this.mirror.up.copy(camera.up).reflect(normal);
    this.mirror.lookAt(
      this.mirror.position.clone().add(direction.reflect(normal)),
    );
    this.mirror.near = camera.near;
    this.mirror.far = camera.far;
    this.mirror.updateMatrixWorld();
    this.mirror.projectionMatrix.copy(camera.projectionMatrix);
    this.reflectionMatrix
      .set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1)
      .multiply(this.mirror.projectionMatrix)
      .multiply(this.mirror.matrixWorldInverse);
    const plane = new THREE.Plane(normal, -z).applyMatrix4(
        this.mirror.matrixWorldInverse,
      ),
      clip = new THREE.Vector4(
        plane.normal.x,
        plane.normal.y,
        plane.normal.z,
        plane.constant,
      );
    const e = this.mirror.projectionMatrix.elements,
      q = new THREE.Vector4(
        (Math.sign(clip.x) + e[8]) / e[0],
        (Math.sign(clip.y) + e[9]) / e[5],
        -1,
        (1 + e[10]) / e[14],
      );
    clip.multiplyScalar(2 / clip.dot(q));
    e[2] = clip.x;
    e[6] = clip.y;
    e[10] = clip.z + 1 - 0.003;
    e[14] = clip.w;
    const previous = renderer.getRenderTarget(),
      xr = renderer.xr.enabled,
      auto = renderer.shadowMap.autoUpdate,
      needs = renderer.shadowMap.needsUpdate;
    this.visible = false;
    try {
      renderer.xr.enabled = false;
      renderer.shadowMap.autoUpdate = false;
      renderer.shadowMap.needsUpdate = needs;
      renderer.setRenderTarget(this.target);
      renderer.clear();
      renderer.render(scene, this.mirror);
    } finally {
      this.visible = true;
      renderer.xr.enabled = xr;
      renderer.shadowMap.autoUpdate = auto;
      renderer.shadowMap.needsUpdate = needs;
      renderer.setRenderTarget(previous);
    }
  }
  setTime(seconds: number) {
    this.material.uniforms.time.value = seconds;
  }
  dispose() {
    this.target.dispose();
    this.geometry.dispose();
    this.material.dispose();
  }
}
