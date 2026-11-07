import * as THREE from "three";

/** Screen-space ink derived from visible geometry, independent of illumination and dithering. */
export class ScreenOutlines {
  private color = new THREE.WebGLRenderTarget(1, 1, { samples: 4 });
  private geometry = new THREE.WebGLRenderTarget(1, 1, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
  });
  private geometryScene = new THREE.Scene();
  private compositeScene = new THREE.Scene();
  private camera = new THREE.Camera();
  private materials: THREE.ShaderMaterial[] = [];
  private composite: THREE.ShaderMaterial;
  private fullscreen: THREE.Mesh;

  constructor() {
    this.geometry.depthTexture = new THREE.DepthTexture(
      1,
      1,
      THREE.UnsignedIntType,
    );
    this.composite = new THREE.ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      uniforms: {
        colorImage: { value: this.color.texture },
        geometryImage: { value: this.geometry.texture },
        depthImage: { value: this.geometry.depthTexture },
        texel: { value: new THREE.Vector2(1, 1) },
        radius: { value: 0.75 },
        projectionInverse: { value: new THREE.Matrix4() },
        ink: { value: new THREE.Color("#444444") },
      },
      vertexShader: `varying vec2 uvScreen; void main(){ uvScreen=position.xy*0.5+0.5; gl_Position=vec4(position.xy,0.0,1.0); }`,
      fragmentShader: `
        uniform sampler2D colorImage,geometryImage,depthImage;
        uniform vec2 texel;
        uniform float radius;
        uniform mat4 projectionInverse;
        uniform vec3 ink;
        varying vec2 uvScreen;
        vec3 viewPoint(vec2 uv,float depth){vec4 p=projectionInverse*vec4(uv*2.0-1.0,depth*2.0-1.0,1.0);return p.xyz/p.w;}
        vec3 decodeNormal(vec2 packed){
          vec2 f=packed*2.0-1.0;
          vec3 n=vec3(f,1.0-abs(f.x)-abs(f.y));
          float t=clamp(-n.z,0.0,1.0);
          n.xy+=vec2(n.x>=0.0?-t:t,n.y>=0.0?-t:t);
          return normalize(n);
        }
        void main(){
          vec4 center=texture2D(geometryImage,uvScreen);
          float occupied=step(0.5,center.a);
          vec3 normal=decodeNormal(center.rg);
          float depth=texture2D(depthImage,uvScreen).x;
          vec3 point=viewPoint(uvScreen,depth);
          float pixelSize=length(viewPoint(uvScreen+vec2(texel.x,0.0),depth)-point);
          float edge=0.0;
          for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
            if(x==0&&y==0)continue;
            vec2 direction=normalize(vec2(float(x),float(y)));
            vec2 uv=clamp(uvScreen+direction*texel*radius,texel*0.5,vec2(1.0)-texel*0.5);
            vec4 other=texture2D(geometryImage,uv);
            if(occupied!=step(0.5,other.a)){edge=1.0;continue;}
            if(occupied<0.5)continue;
            if(dot(normal,decodeNormal(other.rg))<0.88){edge=1.0;continue;}
            vec3 neighbor=viewPoint(uv,texture2D(depthImage,uv).x);
            if(abs(dot(normal,neighbor-point))>max(pixelSize*0.75,0.0001))edge=1.0;
          }
          gl_FragColor=vec4(mix(texture2D(colorImage,uvScreen).rgb,ink,edge),1.0);
          #include <colorspace_fragment>
        }`,
    });
    const triangle = new THREE.BufferGeometry();
    triangle.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3),
    );
    this.fullscreen = new THREE.Mesh(triangle, this.composite);
    this.fullscreen.frustumCulled = false;
    this.compositeScene.add(this.fullscreen);
  }
  /** Adds an opaque surface sharing source-owned buffers; only the pass material is owned here. */
  add(geometry: THREE.BufferGeometry, clipping: THREE.Plane[]) {
    const material = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      clipping: true,
      clippingPlanes: clipping,
      toneMapped: false,
      blending: THREE.NoBlending,
      vertexShader: `
        #include <clipping_planes_pars_vertex>
        varying vec3 surfaceNormal;
        void main(){
          surfaceNormal=normalize(normalMatrix*normal);
          vec4 mvPosition=modelViewMatrix*vec4(position,1.0);
          gl_Position=projectionMatrix*mvPosition;
          #include <clipping_planes_vertex>
        }`,
      fragmentShader: `
        #include <clipping_planes_pars_fragment>
        varying vec3 surfaceNormal;
        void main(){
          #include <clipping_planes_fragment>
          vec3 n=normalize(gl_FrontFacing?surfaceNormal:-surfaceNormal);
          n/=abs(n.x)+abs(n.y)+abs(n.z);
          vec2 packed=n.xy;
          if(n.z<0.0)packed=(1.0-abs(packed.yx))*vec2(packed.x>=0.0?1.0:-1.0,packed.y>=0.0?1.0:-1.0);
          gl_FragColor=vec4(packed*0.5+0.5,0.0,1.0);
        }`,
    });
    this.materials.push(material);
    this.geometryScene.add(new THREE.Mesh(geometry, material));
  }
  /** Drops pass-owned materials before their source buffers are released. */
  clear() {
    this.geometryScene.clear();
    this.materials.forEach((material) => material.dispose());
    this.materials = [];
  }
  /** Releases context-bound targets while retaining the reusable fullscreen CPU geometry. */
  resetTargets() {
    this.color.dispose();
    this.geometry.dispose();
    this.composite.dispose();
    this.fullscreen.geometry.dispose();
  }
  /** Composites constant CSS-pixel ink from opaque silhouettes, depth and normals, independent of mesh ownership. */
  render(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera | THREE.OrthographicCamera,
  ) {
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    if (this.color.width !== size.x || this.color.height !== size.y) {
      this.color.setSize(size.x, size.y);
      this.geometry.setSize(size.x, size.y);
    }
    this.composite.uniforms.texel.value.set(1 / size.x, 1 / size.y);
    this.composite.uniforms.radius.value = renderer.getPixelRatio() * 0.75;
    this.composite.uniforms.projectionInverse.value.copy(
      camera.projectionMatrixInverse,
    );
    renderer.setRenderTarget(this.color);
    renderer.render(scene, camera);
    const clearColor = renderer.getClearColor(new THREE.Color()),
      clearAlpha = renderer.getClearAlpha();
    renderer.setClearColor(0x000000, 0);
    renderer.setRenderTarget(this.geometry);
    renderer.render(this.geometryScene, camera);
    renderer.setClearColor(clearColor, clearAlpha);
    renderer.setRenderTarget(null);
    renderer.render(this.compositeScene, this.camera);
  }
  /** Releases all pass-owned resources; source mesh geometry remains owned by the reviewer. */
  dispose() {
    this.clear();
    this.resetTargets();
    this.composite.dispose();
    this.fullscreen.geometry.dispose();
  }
}
