"""Import approved Tripo props, preserve PBR UVs, repair thin foliage, and write meter/Z-up source data. Run in Blender."""
import hashlib,json,math,struct
from pathlib import Path
import bpy,bmesh
from mathutils import Matrix,Vector
ROOT=Path.cwd(); PROJECT=ROOT/'projects/kowloon-balcony-props'; OUT=ROOT/'generated/kowloon-balcony-props/bake';OUT.mkdir(parents=True,exist_ok=True)
SPECS=json.loads((PROJECT/'concepts/prompts.json').read_text())['assets']
# Validate the complete approved batch before rewriting any bake outputs.
for spec in SPECS:
    result=PROJECT/'source-models'/f"{spec['id']}-result.json"
    if not result.exists() or not result.stat().st_size:
        raise RuntimeError(f"Missing completed result: {result}; restore approved artifacts, do not regenerate automatically")
    task=json.loads(result.read_text())
    model=ROOT/task.get('model_file','')
    if task.get('type')!='image_to_model' or not model.is_file() or model.stat().st_size<28:
        raise RuntimeError(f"Invalid model result: {result}")
    provider=json.loads((model.parent/'task.json').read_text())
    if provider.get('status')!='success' or provider.get('task_id')!=task.get('task_id'):
        raise RuntimeError(f"Provider task is not the completed approved result: {result}")
catalog={};report=[]
REDUCTION={'rubber-plant':.5,'trailing-pothos':.5,'snake-plant':.5,
           'hanging-shirt':.4,'hanging-trousers':.4,'hanging-bedsheet':.3}
POT_TOP={'rubber-plant':.17,'trailing-pothos':.20,'snake-plant':.19}

def preserve_pot(obj,transform,origin,scale,top):
    """Separate the small container so global reduction cannot collapse it under expensive foliage."""
    pot=obj.copy();pot.data=obj.data.copy();bpy.context.collection.objects.link(pot)
    for target,keep_pot in [(obj,False),(pot,True)]:
        bm=bmesh.new();bm.from_mesh(target.data)
        discard=[]
        for face in bm.faces:
            is_pot=max(((transform@v.co-origin)*scale).z for v in face.verts)<=top
            if is_pot!=keep_pot:discard.append(face)
        bmesh.ops.delete(bm,geom=discard,context='FACES')
        bm.to_mesh(target.data);bm.free();target.data.update()
    return pot

def reduce_mesh(obj,ratio,smooth=False):
    """Weld imported seam duplicates geometrically, retaining corner UVs, then collapse redundant edges."""
    mesh=obj.data
    bm=bmesh.new();bm.from_mesh(mesh)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001)
    bm.to_mesh(mesh);bm.free();mesh.update()
    bpy.context.view_layer.objects.active=obj
    modifier=obj.modifiers.new('Balcony repetition budget','DECIMATE')
    modifier.ratio=ratio;modifier.use_collapse_triangulate=True
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    if smooth:
        for polygon in obj.data.polygons:polygon.use_smooth=True
        obj.data.normals_split_custom_set([(0,0,0)]*len(obj.data.loops))

def maps(path,name):
    """Extract the original three channels without retexturing or paid conversion."""
    raw=path.read_bytes();length=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+length]);binary=raw[28+length:]
    material,=doc['materials'];pbr=material['pbrMetallicRoughness']
    for channel,ref in [('color',pbr['baseColorTexture']),('normal',material['normalTexture']),('properties',pbr['metallicRoughnessTexture'])]:
        img=doc['images'][doc['textures'][ref['index']]['source']];view=doc['bufferViews'][img['bufferView']];start=view.get('byteOffset',0)
        (OUT/f'{name}-{channel}').write_bytes(binary[start:start+view['byteLength']])

for spec in SPECS:
    name=spec['id'];result=PROJECT/'source-models'/f'{name}-result.json'
    task=json.loads(result.read_text());path=ROOT/task['model_file'];maps(path,name)
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete()
    bpy.ops.import_scene.gltf(filepath=str(path))
    objects=[o for o in bpy.context.selected_objects if o.type=='MESH']
    rotation=Matrix.Rotation(math.pi/2,4,'Z')
    points=[rotation@o.matrix_world@v.co for o in objects for v in o.data.vertices]
    low=Vector([min(p[i] for p in points) for i in range(3)]);high=Vector([max(p[i] for p in points) for i in range(3)])
    size=high-low;scale=spec['targetHeightMeters']/size.z;origin=Vector([(low.x+high.x)/2,(low.y+high.y)/2,low.z])
    faces=[];source_count=0
    pots=[]
    for obj in objects:
        obj.data.calc_loop_triangles();source_count+=len(obj.data.loop_triangles)
        if name in POT_TOP:
            pot=preserve_pot(obj,rotation@obj.matrix_world,origin,scale,POT_TOP[name])
            pot.data.calc_loop_triangles()
            pot_ratio=min(1,max(.35,96/max(1,len(pot.data.loop_triangles))))
            reduce_mesh(pot,pot_ratio)
            pots.append(pot)
        reduce_mesh(obj,REDUCTION[name],smooth=name not in POT_TOP)
    for obj in objects+pots:
        mesh=obj.data;mesh.calc_loop_triangles();transform=rotation@obj.matrix_world;normal_transform=transform.to_3x3().inverted().transposed();uv=mesh.uv_layers.active.data
        for tri in mesh.loop_triangles:
            face=[];geometric=(normal_transform@tri.normal).normalized()
            for loop,index in zip(tri.loops,tri.vertices):
                p=(transform@mesh.vertices[index].co-origin)*scale;n=(normal_transform@mesh.corner_normals[loop].vector).normalized()
                if n.dot(geometric)<.55:n=geometric
                face.append([*p,*n,*uv[loop].uv])
            faces.append(face)
    plant='plant' in name or name=='trailing-pothos'
    if plant:
        # Opposing low-poly leaf skins are nearly coincident; give each a submillimeter offset.
        top={'rubber-plant':.17,'trailing-pothos':.20,'snake-plant':.19}[name]
        for face in faces:
            for v in face:
                if v[2]>top:
                    for axis in range(3):v[axis]+=.0007*v[axis+3]
    if plant:
        base=[v for f in faces for v in f if v[2]<.025]
        cx=(min(v[0] for v in base)+max(v[0] for v in base))/2
        cy=(min(v[1] for v in base)+max(v[1] for v in base))/2
        bottom=min(v[2] for f in faces for v in f)
        for face in faces:
            for v in face:v[0]-=cx;v[1]-=cy;v[2]-=bottom
    else:
        # Empty fabric collapses in depth; inverse-transpose normals preserve its smooth shading.
        factor=min(1,.048/(size.y*scale))
        for face in faces:
            for v in face:
                v[1]*=factor;n=Vector((v[3],v[4]/factor,v[5])).normalized();v[3:6]=n
    sizes=[max(v[i] for f in faces for v in f)-min(v[i] for f in faces for v in f) for i in range(3)]
    catalog[name]={'size':sizes,'faces':faces,'plant':plant}
    report.append({'id':name,'source':str(path.relative_to(ROOT)),'sourceSha256':hashlib.sha256(path.read_bytes()).hexdigest(),'sourceTriangles':source_count,'triangles':len(faces),'reductionRatio':REDUCTION[name],'uniformScale':scale,'size':sizes,'taskId':task['task_id'],'credits':task['credits_consumed']})
(OUT/'catalog.json').write_text(json.dumps(catalog))
(PROJECT/'bake-report.json').write_text(json.dumps(report,indent=2)+'\n')
print('Baked',[(k,len(v['faces'])) for k,v in catalog.items()])
