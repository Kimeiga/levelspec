import { Matrix4 } from "three";
import type { CompiledArchitecture } from "../../src/architecture/types.ts";
import { KitMesh } from "../../src/dressing/kit-mesh.ts";
import { kitMaterials, kitFinishes } from "../../src/dressing/kit.ts";
import { Pen } from "../../src/dressing/pen.ts";
import { Kit } from "../../src/dressing/kowloon/kit.ts";
import { planGrocerLayout } from "../../src/dressing/kowloon/shop/grocer-layout.ts";
import { grocer } from "../../src/dressing/kowloon/shop/grocer.ts";
import { drawFrontage } from "../../src/dressing/kowloon/shop/frontage.ts";
import { drawDisplay, type DisplayKind } from "../../src/dressing/kowloon/shop/display-assemblies.ts";
import { GroundSupport } from "../../src/dressing/kowloon/ground-support.ts";
import { srgb } from "../../src/dressing/kowloon/palette.ts";

/** Builds a visual prop study from the real grocer generator, independently of map compilation. */
export function shopPreview(width = 2.4, depth = 2.9, height = 2.6, displaysOnly = false, seed = "layout-20") {
  if (displaysOnly) width = 4.6;
  const texture = "/projects/dressing-demo/textures/";
  const materials = [
    { id:"room", color:"#ffffff", roughness:.9, metalness:0, repeat:1 },
    { id:"study-grocer-props", color:"#ffffff", roughness:1, metalness:1, repeat:1,
      texture:texture+"grocer-props.png", normalTexture:texture+"grocer-props-normal.png", metallicRoughnessTexture:texture+"grocer-props-properties.png" },
    { id:"study-snack-packet", color:"#ffffff", roughness:.65, metalness:0, repeat:1, texture:texture+"snack-packet.png" },
    { id:"study-market-apple", color:"#ffffff", roughness:.7, metalness:0, repeat:1, texture:texture+"market-apple.png" },
    { id:"study-timber", color:"#ffffff", roughness:.8, metalness:0, repeat:1.5, texture:texture+"timber.png" },
    { id:"study-shop-timber", color:"#ffffff", roughness:1, metalness:1, repeat:1,
      texture:texture+"shop-timber.png", normalTexture:texture+"shop-timber-normal.png", metallicRoughnessTexture:texture+"shop-timber-properties.png" },
    { id:"study-metal", color:"#ffffff", roughness:.55, metalness:.2, repeat:1.4, texture:texture+"metal.png" },
  ];
  const level = {
    architecture:{materials:[]}, document:{materials}, provenance:{}, surfaces:[],
    mesh:{positions:[], normals:[], uv:[], colors:[], indices:[], surfaces:[]},
  } as unknown as CompiledArchitecture;
  kitMaterials(level);
  const mesh = new KitMesh(level,"study","study",kitFinishes(level,"study","room").materials,{maximumTriangles:100000});
  const pen = new Pen(mesh,"shop-grocer",new Matrix4(),false);
  const kit = new Kit(seed,2,.6,.3,false,false);
  const room = pen.into("room");
  room.box("paint",[-.08,-2,-.08],[width+.08,depth+.08,0],srgb("#737678"),"");
  const before = level.mesh.indices.length/3;
  if (displaysOnly) {
    const kinds: DisplayKind[] = ["stool","box-stand","crate-shelf","cart"];
    for (const [index,kind] of kinds.entries())
      drawDisplay(pen.into("shop-frontage").move(.5+index*1.2,0,0),kind,"greengrocer",kit.rng(`assembly/${kind}`));
    return {mesh:level.mesh,surfaces:level.surfaces,materials:level.document.materials,
      triangles:level.mesh.indices.length/3-before,frontageTriangles:level.mesh.indices.length/3-before,plans:kinds,width,depth,height};
  }
  const layout = planGrocerLayout(width,depth,height,kit.rng("study/layout"));
  const ground = new GroundSupport(level.mesh, level.surfaces);
  grocer.furnish({pen,width,depth,height,kit,key:"study"});
  const interiorTriangles = level.mesh.indices.length/3-before;
  const outward = pen.facing([0,0,0],[1,0,0],[0,-1,0]);
  const plans = drawFrontage({pen:outward,width,trade:"grocer",kit,key:"study",
    available:(x0,x1,projection) => ground.covers(outward,x0,x1,.025,projection+1.2)});
  const triangles = level.mesh.indices.length/3-before;
  const frontageTriangles = triangles-interiorTriangles;
  room.box("paint",[-.08,0,0],[0,depth,height],srgb("#c9c1a7"),"");
  room.box("paint",[width,0,0],[width+.08,depth,height],srgb("#c9c1a7"),"");
  room.box("paint",[0,depth,0],[width,depth+.08,height],srgb("#c9c1a7"),"");
  return {mesh:level.mesh,surfaces:level.surfaces,materials:level.document.materials,triangles,frontageTriangles,plans,layout,width,depth,height};
}
