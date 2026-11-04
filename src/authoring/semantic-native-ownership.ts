import {projectNativeFloor} from './semantic-native-projection.ts';
import type {LevelDocument} from '../vector/types.ts';

export function nativeRegionCells(document:LevelDocument,grid:number) {
  return new Map(projectNativeFloor(document,grid).areas.map(a=>[a.id,new Set(a.cells!.map(c=>c.join(',')))]));
}
/** XY cell ownership distinguishes the two independently transformed sides of a seam. */
export function nativeBoundaryCells(document:LevelDocument,grid:number) {
  const regions=nativeRegionCells(document,grid),owners=new Map<string,Set<string>>();
  for(const layer of document.layers)for(const region of layer.regions)for(const ref of [region.boundary,...region.holes].flat()){
    const id=ref.replace(/^-/,'');if(!owners.has(id))owners.set(id,new Set());
    for(const cell of regions.get(region.id)!)owners.get(id)!.add(cell);
  }
  return owners;
}
