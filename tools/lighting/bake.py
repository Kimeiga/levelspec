"""Bake the canonical SVGX mesh; no re-triangulation or geometry repair in Blender."""
import argparse, hashlib, json, math, sys
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector
sys.path.insert(0, str(Path(__file__).parent))
from lightmap_io import float_image, image_pixels, save_linear_exr

def linear_hex(text):
    values=[int(text[i:i+2],16)/255 for i in (1,3,5)]
    return [v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in values]

def pad_charts(rgb, labels, steps):
    """Extend nearest chart identity and values, without overwriting covered black."""
    result=rgb.copy(); owners=labels.copy(); h,w=labels.shape
    for _ in range(steps):
        expanded=np.pad(owners,1,constant_values=-1); data=np.pad(result,((1,1),(1,1),(0,0)))
        empty=owners<0; next_owners=owners.copy(); next_values=result.copy()
        for dy,dx in ((0,1),(1,0),(1,2),(2,1),(0,0),(0,2),(2,0),(2,2)):
            neighbor=expanded[dy:dy+h,dx:dx+w]; take=empty&(neighbor>=0)
            next_owners[take]=neighbor[take]; next_values[take]=data[dy:dy+h,dx:dx+w][take];empty[take]=False
        owners,result=next_owners,next_values
    return result,owners

def mip(rgb,labels):
    """Each output texel averages only its dominant chart, never unrelated islands."""
    h,w=labels.shape;H,W=(h+1)//2,(w+1)//2
    labs=np.pad(labels,((0,h%2),(0,w%2)),constant_values=-1).reshape(H,2,W,2).transpose(0,2,1,3).reshape(H,W,4)
    vals=np.pad(rgb,((0,h%2),(0,w%2),(0,0))).reshape(H,2,W,2,4).transpose(0,2,1,3,4).reshape(H,W,4,4)
    counts=(labs[:,:,:,None]==labs[:,:,None,:]).sum(axis=3);counts[labs<0]=0
    selected=np.argmax(counts,axis=2);chosen=np.take_along_axis(labs,selected[:,:,None],axis=2)[:,:,0]
    matches=(labs==chosen[:,:,None])&(chosen[:,:,None]>=0);den=matches.sum(axis=2)
    output=(vals*matches[:,:,:,None]).sum(axis=2)/np.maximum(den[:,:,None],1)
    return output.astype(np.float32),chosen

def labels_for_page(payload,page):
    m=payload['mesh'];a=payload['atlas']['pages'][page];w,h=a['width'],a['height'];labels=np.full((h,w),-1,np.int32);uv=np.asarray(m['uv1']).reshape(-1,2);ids=np.asarray(m['indices']).reshape(-1,3)
    for t,tri in enumerate(ids):
        if m['atlasPages'][t]!=page:continue
        p=uv[tri]*[w,h];lo=np.maximum(np.floor(p.min(axis=0)).astype(int),0);hi=np.minimum(np.ceil(p.max(axis=0)).astype(int),[w,h])
        if np.any(hi<=lo):continue
        xx,yy=np.meshgrid(np.arange(lo[0],hi[0])+.5,np.arange(lo[1],hi[1])+.5)
        den=(p[1,1]-p[2,1])*(p[0,0]-p[2,0])+(p[2,0]-p[1,0])*(p[0,1]-p[2,1])
        if abs(den)<1e-14:continue
        A=((p[1,1]-p[2,1])*(xx-p[2,0])+(p[2,0]-p[1,0])*(yy-p[2,1]))/den
        B=((p[2,1]-p[0,1])*(xx-p[2,0])+(p[0,0]-p[2,0])*(yy-p[2,1]))/den
        mask=(A>=-1e-6)&(B>=-1e-6)&(A+B<=1+1e-6);view=labels[lo[1]:hi[1],lo[0]:hi[0]];chart=m['chartIds'][t]
        if np.any(mask&(view>=0)&(view!=chart)):raise ValueError('Overlapping chart coverage')
        view[mask]=chart
    return labels

def run(args):
    inp=json.loads(Path(args.input).read_text());out=Path(args.output);out.mkdir(parents=True,exist_ok=False)
    calibration=json.loads(Path(args.calibration).read_text())
    if calibration['blenderVersion']!=bpy.app.version_string:raise ValueError('Calibration Blender version does not match')
    bpy.ops.wm.read_factory_settings(use_empty=True);scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.render.threads_mode='FIXED';scene.render.threads=4
    scene.cycles.samples=args.samples;scene.cycles.max_bounces=4;scene.cycles.diffuse_bounces=4;scene.cycles.seed=17;scene.cycles.use_denoising=False;scene.cycles.use_adaptive_sampling=False
    scene.view_settings.view_transform='Standard';scene.view_settings.look='None';scene.view_settings.exposure=0;scene.view_settings.gamma=1
    m=inp['mesh'];positions=np.asarray(m['positions']).reshape(-1,3);tris=np.asarray(m['indices']).reshape(-1,3)
    materials={x['id']:x for x in inp['materials']};bindings={};targets=[];objects=[]
    for part in inp['meshes']:
        if part['dynamic'] or not part.get('visible', True):continue
        selected=part['triangles'];originals=np.unique(tris[selected]);index={int(old):i for i,old in enumerate(originals)}
        mesh=bpy.data.meshes.new(part['id']);mesh.from_pydata(positions[originals].tolist(),[],[[index[int(v)] for v in tris[t]] for t in selected]);mesh.update()
        obj=bpy.data.objects.new(part['id'],mesh);scene.collection.objects.link(obj);obj['meshKind']=part['kind'];obj['layer']=part['layer'];obj['layers']=part.get('layers',[part['layer']]);objects.append(obj);obj.select_set(True);bpy.context.view_layer.objects.active=obj
        ownership=mesh.attributes.new('source_surface','INT','FACE')
        for face,t in zip(mesh.polygons,selected):ownership.data[face.index].value=m['surfaces'][t]
        for name,key in [('Material','uv'),('Lightmap','uv1')]:
            layer=mesh.uv_layers.new(name=name);values=np.asarray(m[key]).reshape(-1,2)
            for face,t in zip(mesh.polygons,selected):
                for li,vi in zip(face.loop_indices,tris[t]):layer.data[li].uv=values[vi]
        normals=np.asarray(m['normals']).reshape(-1,3);mesh.normals_split_custom_set(normals[tris[selected].ravel()].tolist())
        slots={}
        for face,t in zip(mesh.polygons,selected):
            surface=inp['surfaces'][m['surfaces'][t]];page=m['atlasPages'][t];key=(surface['material'],page)
            if key not in bindings:
                definition=materials.get(surface['material'],{'color':'#b9c7d1','roughness':.8,'metalness':0});mat=bpy.data.materials.new(f'{key[0]}.atlas{page}');mat.use_nodes=True;nodes=mat.node_tree.nodes;bsdf=nodes.get('Principled BSDF');bsdf.inputs['Base Color'].default_value=(*linear_hex(definition['color']),1);bsdf.inputs['Roughness'].default_value=definition['roughness'];bsdf.inputs['Metallic'].default_value=definition['metalness']
                if definition.get('texture'):raise ValueError('External material textures require resolved image packaging before baking.')
                uvnode=nodes.new('ShaderNodeUVMap');uvnode.uv_map='Lightmap';target=nodes.new('ShaderNodeTexImage');mat.node_tree.links.new(uvnode.outputs['UV'],target.inputs['Vector']);targets.append((nodes,target,page));bindings[key]=mat
            if key not in slots:slots[key]=len(mesh.materials);mesh.materials.append(bindings[key])
            face.material_index=slots[key]
    world=bpy.data.worlds.new('SVGX sky');world.use_nodes=True;scene.world=world;bg=world.node_tree.nodes.get('Background');bg.inputs['Color'].default_value=(*linear_hex(inp['sky']['color']),1);bg.inputs['Strength'].default_value=inp['sky']['intensity']
    lights=[]
    for spec in inp['lights']:
        data=bpy.data.lights.new(spec['id'],{'directional':'SUN','point':'POINT','spot':'SPOT'}[spec['kind']]);light=bpy.data.objects.new(spec['id'],data);scene.collection.objects.link(light);light.location=spec['position'];data.color=linear_hex(spec['color']);data.energy=spec['intensity']*(1 if spec['kind']=='directional' else 4*math.pi)
        if spec['kind']!='point':light.rotation_euler=(Vector(spec['target'])-Vector(spec['position'])).to_track_quat('-Z','Y').to_euler()
        if spec['kind']=='spot':data.spot_size=2*spec.get('angle',math.pi/4)
        lights.append(light)
    def bake(name,filters):
        images=[float_image(f'{name}.page{p["id"]}',p['width'],p['height']) for p in inp['atlas']['pages']]
        for nodes,target,page in targets:
            for n in nodes:n.select=False
            target.image=images[page];target.select=True;nodes.active=target
        bpy.ops.object.bake(type='DIFFUSE',pass_filter=set(filters),margin=0,use_clear=False,use_selected_to_active=False,uv_layer='Lightmap')
        values=[]
        for page,image in enumerate(images):
            value=image_pixels(image)
            if not np.isfinite(value).all():raise ValueError('Nonfinite bake output')
            save_linear_exr(image,out/f'raw-{name}-{page}.exr');image.pack();values.append(value)
        return values
    for light in lights:light.hide_render=True
    sky=bake('sky',['DIRECT','INDIRECT']);bg.inputs['Strength'].default_value=0
    for light in lights:light.hide_render=False
    bounce=bake('bounce',['INDIRECT']);bg.inputs['Strength'].default_value=inp['sky']['intensity']
    pages=[]
    for page,(a,b) in enumerate(zip(sky,bounce)):
        labels=labels_for_page(inp,page);coverage=labels>=0;rgba=a.copy();rgba[:,:,:3]+=b[:,:,:3];rgba[:,:,3]=coverage.astype(np.float32);np.save(out/f'coverage-{page}.npy',coverage);np.save(out/f'charts-{page}.npy',labels)
        np.testing.assert_allclose(a[:,:,3]>0,b[:,:,3]>0);padded,expanded=pad_charts(rgba,labels,inp['atlas']['padding']);mips=[]
        image=float_image(f'Hybrid.page{page}',padded.shape[1],padded.shape[0]);image.pixels.foreach_set(padded.ravel());file=f'{inp["id"]}.lightmap-{page}.exr';save_linear_exr(image,out/file);image.pack()
        current,owners=padded,expanded
        for lod in range(1,inp['atlas']['safeMip']+1):
            current,owners=mip(current,owners);im=float_image(f'Hybrid.page{page}.mip{lod}',current.shape[1],current.shape[0]);im.pixels.foreach_set(current.ravel());name=f'{inp["id"]}.lightmap-{page}.mip{lod}.exr';save_linear_exr(im,out/name);mips.append({'file':name,'sha256':hashlib.sha256((out/name).read_bytes()).hexdigest()})
        pages.append({'id':page,'file':file,'sha256':hashlib.sha256((out/file).read_bytes()).hexdigest(),'mips':mips,'coverageTexels':int(coverage.sum()),'maximum':float(rgba[:,:,:3][coverage].max()) if coverage.any() else 0})
    bpy.ops.wm.save_as_mainfile(filepath=str(out/f'{inp["id"]}.blend'))
    manifest={'version':1,'geometryHash':inp['geometryHash'],'uvHash':inp['atlas']['uvHash'],'revision':inp['lightingRevision'],'stateHash':inp['lightingStateHash'],'compilerVersion':inp['compilerRevision'],'rendererVersion':inp['rendererRevision'],'blenderVersion':bpy.app.version_string,'samples':args.samples,'seed':17,'colorSpace':'Linear-sRGB','encoding':'FLOAT_RGBA_EXR','transport':'sky-direct-indirect-plus-lights-indirect','irradianceScale':calibration['calibration']['irradianceDecodeMultiplier'],'uvChannel':1,'flipY':False,'dynamicOccluders':False,'safeMip':inp['atlas']['safeMip'],'pages':pages}
    (out/f'{inp["id"]}.lighting.json').write_text(json.dumps(manifest,indent=2));print('SVGX_BAKE_COMPLETE',json.dumps({'pages':len(pages),'output':str(out)}))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--input',required=True);parser.add_argument('--output',required=True);parser.add_argument('--calibration',required=True);parser.add_argument('--samples',type=int,default=64);run(parser.parse_args(sys.argv[sys.argv.index('--')+1:]))
