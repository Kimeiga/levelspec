import { Matrix4 } from "three";
import type { CompiledArchitecture } from "../../src/architecture/types.ts";
import { KitMesh } from "../../src/dressing/kit-mesh.ts";
import { kitMaterials, kitFinishes } from "../../src/dressing/kit.ts";
import { Pen } from "../../src/dressing/pen.ts";
import { Kit } from "../../src/dressing/kowloon/kit.ts";
import { roast } from "../../src/dressing/kowloon/shop/roast.ts";
import { srgb } from "../../src/dressing/kowloon/palette.ts";


/** Builds the real roast restaurant in a neutral, meter-sized inspection room. */
export function shopPreview(width = 3.6, depth = 2.9, height = 2.6, seed = "restaurant-8") {
  const texture = "/projects/dressing-demo/textures/";
  const materials = [
    { id:"study-wall-posters", color:"#ffffff", roughness:.96, metalness:0, repeat:1, texture:"/projects/kowloon-posters/textures/posters-atlas.jpg" },
    { id:"room", color:"#ffffff", roughness:.9, metalness:0, repeat:1 },
    { id:"study-grocer-props", color:"#ffffff", roughness:1, metalness:1, repeat:1,
      texture:texture+"grocer-props.png", normalTexture:texture+"grocer-props-normal.png", metallicRoughnessTexture:texture+"grocer-props-properties.png" },
    { id:"study-snack-packet", color:"#ffffff", roughness:.65, metalness:0, repeat:1, texture:texture+"snack-packet.png" },
    { id:"study-market-apple", color:"#ffffff", roughness:.7, metalness:0, repeat:1, texture:texture+"market-apple.png" },
    { id:"study-timber", color:"#ffffff", roughness:.8, metalness:0, repeat:1.5, texture:texture+"timber.png" },
    { id:"study-shop-timber", color:"#ffffff", roughness:1, metalness:1, repeat:1,
      texture:texture+"shop-timber.png", normalTexture:texture+"shop-timber-normal.png", metallicRoughnessTexture:texture+"shop-timber-properties.png" },
    { id:"study-restaurant-food", color:"#ffffff", roughness:1, metalness:1, repeat:1, texture:texture+"restaurant-food.png", normalTexture:texture+"restaurant-food-normal.png", metallicRoughnessTexture:texture+"restaurant-food-properties.png" },
    { id:"study-brushed-metal", color:"#ffffff", roughness:1, metalness:1, repeat:2, texture:texture+"brushed-metal.png", normalTexture:texture+"brushed-metal-normal.png", metallicRoughnessTexture:texture+"brushed-metal-properties.png" },
    { id:"study-restaurant-tiles", color:"#ffffff", roughness:1, metalness:1, repeat:1, texture:texture+"restaurant-tiles.png", normalTexture:texture+"restaurant-tiles-normal.png", metallicRoughnessTexture:texture+"restaurant-tiles-properties.png" },
    { id:"study-restaurant-surfaces", color:"#ffffff", roughness:1, metalness:1, repeat:1, texture:texture+"restaurant-surfaces.png", metallicRoughnessTexture:texture+"restaurant-surfaces-properties.png" },
    { id:"study-lettering", color:"#ffffff", roughness:.8, metalness:0, repeat:1, texture:texture+"lettering.png", alphaCutoff:.5 },
    { id:"study-metal", color:"#ffffff", roughness:.55, metalness:.2, repeat:1.4, texture:texture+"metal.png" },
  ];
  const level = {
    architecture:{materials:[]}, document:{materials}, provenance:{}, surfaces:[],
    mesh:{positions:[], normals:[], uv:[], colors:[], indices:[], surfaces:[]},
  } as unknown as CompiledArchitecture;
  kitMaterials(level);
  const mesh = new KitMesh(level,"study","study",kitFinishes(level,"study","room").materials,{maximumTriangles:100000});
  const pen = new Pen(mesh,"shop-roast",new Matrix4(),false);
  const kit = new Kit(seed,2,.6,.3,true);
  roast.furnish({pen,width,depth,height,kit,key:"study"});
  const triangles = level.mesh.indices.length / 3;
  const room = pen.into("room");
  room.box("paint",[-.08,-1,-.08],[width+.08,depth+.08,0],srgb("#8a5142"),"");
  const walls = room.into("room-walls");
  walls.box("paint",[-.08,0,0],[0,depth,height],srgb("#d9d8c8"),"");
  walls.box("paint",[width,0,0],[width+.08,depth,height],srgb("#d9d8c8"),"");
  walls.box("paint",[0,depth,0],[width,depth+.08,height],srgb("#d9d8c8"),"");
  return {mesh:level.mesh,surfaces:level.surfaces,materials:level.document.materials,triangles,width,depth,height};
}
