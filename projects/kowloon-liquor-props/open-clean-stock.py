"""Open the authored production containers as editable Blender meshes with their actual UVs and PBR atlas."""
import json
from pathlib import Path
import bpy
from mathutils import Vector

root=Path.cwd()
catalog=json.loads((root/'src/dressing/kowloon/shop/assets/grocer-props.json').read_text())
appearances=json.loads((root/'src/dressing/kowloon/shop/assets/stock-appearances.json').read_text())
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
def stock_material(name):
    """Use the compact editable source maps, independently of the runtime atlas packing."""
    material=bpy.data.materials.new(name+' — compact PBR')
    material.use_nodes=True
    nodes=material.node_tree.nodes
    principled=nodes.get('Principled BSDF')
    for suffix,kind in [('', 'color'),('-normal','normal'),('-properties','properties')]:
     image=bpy.data.images.load(str(root/f'projects/kowloon-liquor-props/materials/clean-stock/{name}-{kind}-256.png'))
     if suffix:image.colorspace_settings.name='Non-Color'
     texture=nodes.new('ShaderNodeTexImage');texture.image=image;texture.label=kind
     if kind=='color':material.node_tree.links.new(texture.outputs['Color'],principled.inputs['Base Color'])
     elif kind=='normal':
      normal=nodes.new('ShaderNodeNormalMap');material.node_tree.links.new(texture.outputs['Color'],normal.inputs['Color']);material.node_tree.links.new(normal.outputs['Normal'],principled.inputs['Normal'])
     else:
      split=nodes.new('ShaderNodeSeparateColor');material.node_tree.links.new(texture.outputs['Color'],split.inputs['Color']);material.node_tree.links.new(split.outputs['Green'],principled.inputs['Roughness']);material.node_tree.links.new(split.outputs['Blue'],principled.inputs['Metallic'])
    return material

objects=[]
for index,name in enumerate(['food-tin','seasoning-jar','drink-bottle']):
 asset=catalog[name];material=stock_material(name);source=appearances[name]['source'];points=[];indices={};faces=[]
 for face in asset['faces']:
  polygon=[]
  for vertex in face:
   key=tuple(vertex[:3])
   if key not in indices:indices[key]=len(points);points.append(key)
   polygon.append(indices[key])
  faces.append(polygon)
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(points,[],faces);mesh.update();uv=mesh.uv_layers.new(name='Rear seam + separate caps');normals=[]
 for polygon,face in zip(mesh.polygons,asset['faces']):
  polygon.use_smooth=not all(abs(vertex[5])==1 for vertex in face)
  for loop,vertex in zip(polygon.loop_indices,face):uv.data[loop].uv=[(vertex[6+a]-source[a])/(source[a+2]-source[a]) for a in range(2)];normals.append(vertex[3:6])
 mesh.normals_split_custom_set(normals)
 obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);obj.location.x=(index-1)*.23;obj.data.materials.append(material);objects.append(obj)
 edge_uvs={}
 for polygon in mesh.polygons:
  loops=list(polygon.loop_indices)
  for offset,loop in enumerate(loops):
   nxt=loops[(offset+1)%len(loops)];a,b=mesh.loops[loop].vertex_index,mesh.loops[nxt].vertex_index
   pair={a:tuple(uv.data[loop].uv),b:tuple(uv.data[nxt].uv)}
   edge_uvs.setdefault(tuple(sorted((a,b))),[]).append(pair)
 for edge in mesh.edges:
  pairs=edge_uvs[tuple(sorted(edge.vertices))]
  edge.use_seam=len(pairs)==2 and pairs[0]!=pairs[1]
 obj['triangles']=len(faces);obj['workflow']='Authored profile, continuous cylindrical body UV, separate cap islands; generated label art.'
# Set an inspectable material-preview camera and keep the UV workspace available.
bpy.context.view_layer.objects.active=objects[0]
for obj in objects:obj.select_set(True)
for screen in bpy.data.screens:
 for area in screen.areas:
  if area.type=='VIEW_3D':
   area.spaces.active.shading.type='MATERIAL';region=area.spaces.active.region_3d;region.view_distance=.8;region.view_location=Vector((0,0,.11));region.view_rotation=Vector((.5,-2,1)).to_track_quat('Z','Y')
  if area.type=='IMAGE_EDITOR':area.spaces.active.image=bpy.data.images.get('food-tin-color-256.png')
for image in bpy.data.images:
 if image.source=='FILE':image.pack()
path=root/'projects/kowloon-liquor-props/materials/clean-stock/clean-stock.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(path))
print(path)
