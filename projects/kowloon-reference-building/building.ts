import { Matrix4 } from 'three';
import type { CompiledArchitecture } from '../../src/architecture/types.ts';
import { bindLibraryMaterial } from '../../src/materials/catalog.ts';
import { kitFinishes } from '../../src/dressing/kit.ts';
import { KitMesh } from '../../src/dressing/kit-mesh.ts';
import { Pen } from '../../src/dressing/pen.ts';
import { Kit } from '../../src/dressing/kowloon/kit.ts';
import { buildingFaces } from './parts/composition.ts';
import { drawBuildingShell, drawBalcony, drawGroundContact } from './parts/structure.ts';
import { drawShopfronts } from './parts/shops.ts';
import { drawBuildingFixtures } from './parts/fixtures.ts';

/**
 * Appends this reference's explicit exterior composition to a detached compiled render mesh.
 * Coordinates are world meters, Z up. The caller owns shared kit material registration,
 * appearance compilation and export refresh; appended parts never enter physics/navigation.
 */
export function dressReferenceBuilding(level: CompiledArchitecture): void {
  const wall = bindLibraryMaterial(level.document.materials, 'plaster');
  const finishes = kitFinishes(level, undefined, wall);
  const mesh = new KitMesh(level, 'reference-building', 'default', finishes.materials, { maximumTriangles: 1_000_000 });
  const root = new Pen(mesh, 'envelope', new Matrix4(), false);
  const kit = new Kit('reference-building', 2, .7, .35, true, 64, .3);
  const wallKit = new Kit('reference-building', 2, .95, .9, true, 192, .3);
  const context = { root, kit, wallKit };
  const faces = buildingFaces(root);
  drawBuildingShell(context, faces);
  drawBalcony(context, faces[0].pen);
  drawShopfronts(context, faces[0], faces[2]);
  drawBuildingFixtures(context, faces[0].pen, faces[2].pen);
  drawGroundContact(context);
}
