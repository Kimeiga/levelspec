"""Pack aligned 512px PBR charts into two shared 1K atlases, recording geometry and suspension points."""
import hashlib,json,math,random
from pathlib import Path
from PIL import Image,ImageFilter
ROOT=Path.cwd();PROJECT=ROOT/'projects/kowloon-balcony-props';BAKE=ROOT/'generated/kowloon-balcony-props/bake'
catalog=json.loads((BAKE/'catalog.json').read_text());SIZE=1024;CELL=512;PAD=8;INNER=CELL-2*PAD
NAMES={'plants':['rubber-plant','trailing-pothos','snake-plant'],'cloth':['hanging-shirt','hanging-trousers','hanging-bedsheet']}

# Refuse a partial library before touching the adopted catalog or any shared image.
required=[name for names in NAMES.values() for name in names]
if set(catalog)!=set(required):raise RuntimeError('The complete six-model baked catalog is required')
for name in required:
    if not catalog[name]['faces']:raise RuntimeError(f'Empty geometry: {name}')
    for channel in ['color','normal','properties']:
        with Image.open(BAKE/f'{name}-{channel}') as source:source.verify()
with Image.open(PROJECT/'concepts/plain-cotton.png') as source:source.verify()

def linear(c):
    """Decode source albedo into linear vertex colors for explicit plain-material overrides."""
    c/=255;return c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4

def repair_normals(face):
    """Keep valid smooth normals; repair interpolated normals that oppose a reduced triangle."""
    a,b,c=face;e=[b[i]-a[i] for i in range(3)];d=[c[i]-a[i] for i in range(3)]
    n=[e[1]*d[2]-e[2]*d[1],e[2]*d[0]-e[0]*d[2],e[0]*d[1]-e[1]*d[0]]
    length=math.sqrt(sum(v*v for v in n))
    if length<1e-12:raise RuntimeError('Reduced mesh contains a collapsed face')
    n=[v/length for v in n]
    for v in face:
        if sum(n[i]*v[i+3] for i in range(3))<.05:v[3:6]=n

def uvpoint(u,v,tile):
    """Map UVs into padded atlas texel centers, keeping all PBR channels aligned."""
    return [(tile%2*CELL+PAD+.5+u*(INNER-1))/SIZE,1-(tile//2*CELL+PAD+.5+(1-v)*(INNER-1))/SIZE]

def tile_image(small):
    """Extrude edge pixels into the gutter to protect mip levels."""
    padded=Image.new('RGB',(CELL,CELL));padded.paste(small,(PAD,PAD))
    for i in range(PAD):
        padded.paste(small.crop((0,0,INNER,1)),(PAD,i));padded.paste(small.crop((0,INNER-1,INNER,INNER)),(PAD,CELL-PAD+i))
    for i in range(PAD):
        padded.paste(padded.crop((PAD,0,PAD+1,CELL)),(i,0));padded.paste(padded.crop((CELL-PAD-1,0,CELL-PAD,CELL)),(CELL-PAD+i,0))
    return padded

production={};outputs={}
for group,names in NAMES.items():
    atlases={channel:Image.new('RGB',(SIZE,SIZE),fill) for channel,fill in [('color',(160,150,135)),('normal',(128,128,255)),('properties',(255,200,0))]}
    for tile,name in enumerate(names):
        asset=catalog[name]
        for channel,atlas in atlases.items():
            small=Image.open(BAKE/f'{name}-{channel}').convert('RGB').resize((INNER,INNER),Image.Resampling.LANCZOS)
            if channel=='color' and name in ['hanging-shirt','hanging-bedsheet']:
                small=Image.open(PROJECT/'concepts/plain-cotton.png').convert('RGB').resize((INNER,INNER),Image.Resampling.LANCZOS)
            if channel=='normal' and name=='hanging-bedsheet':
                # Remove the rejected floral print's embossed normal detail; folds remain real geometry.
                small=Image.new('RGB',(INNER,INNER),(128,128,255))
            if channel=='properties':
                # These objects are dielectric clay, enamel, foliage and cotton, not metallic.
                small=Image.merge('RGB',(Image.new('L',small.size,255),small.getchannel('G').point(lambda v:max(115 if group=='plants' else 185,v)),Image.new('L',small.size,0)))
            atlas.paste(tile_image(small),(tile%2*CELL,tile//2*CELL))
        faces=asset['faces']
        if group=='cloth':
            vertices=[v for f in faces for v in f];width=asset['size'][0];height=asset['size'][2]
            if name=='hanging-bedsheet':
                # Folded linen is clipped below a cord at its two upper corners.
                anchors=[max([v for v in vertices if sign*v[0]>width*.25],key=lambda v:v[2])[:3] for sign in [-1,1]]
            else:
                anchors=[max([v for v in vertices if width*.26<sign*v[0]<width*.40],key=lambda v:v[2])[:3] for sign in [-1,1]]
            left,right=anchors;dx=right[0]-left[0];ys=(right[1]-left[1])/dx;zs=(right[2]-left[2])/dx
            yc=left[1]-ys*left[0];zc=left[2]-zs*left[0]
            # Shear only aligns the two actual suspension vertices; the base scale stays uniform.
            for f in faces:
                for v in f:
                    v[1]-=yc+ys*v[0];v[2]-=zc+zs*v[0]
                    n=[v[3]+ys*v[4]+zs*v[5],v[4],v[5]];length=math.sqrt(sum(c*c for c in n));v[3:6]=[c/length for c in n]
            asset['anchors']=[[a[0],0,0] for a in anchors]
        for face in faces:
            for vertex in face:vertex[6:8]=uvpoint(*vertex[6:8],tile)
        asset['slot']='balcony-'+group;asset['tile']=tile
        production[name]=asset
    if group=='cloth':
        plain=Image.open(PROJECT/'concepts/plain-cotton.png').convert('RGB').resize((INNER,INNER),Image.Resampling.LANCZOS)
        atlases['color'].paste(tile_image(plain),(CELL,CELL))
        atlases['normal'].paste(tile_image(Image.new('RGB',(INNER,INNER),(128,128,255))),(CELL,CELL))
        atlases['properties'].paste(tile_image(Image.new('RGB',(INNER,INNER),(255,240,0))),(CELL,CELL))
    if group=='plants' and 'rubber-plant' in production:
        # The generator omitted the pot wall between its complete saucer and soil rim.
        rand=random.Random(43);noise=Image.new('L',(128,40));noise.putdata([rand.randrange(256) for _ in range(128*40)]);noise=noise.resize((INNER,INNER),Image.Resampling.BICUBIC).filter(ImageFilter.GaussianBlur(4))
        clay=Image.new('RGB',(INNER,INNER));pixels=clay.load()
        for y in range(INNER):
            for x in range(INNER):
                n=noise.getpixel((x,y))/255;chalk=max(0,(n-.55))*(max(0,1-y/INNER)*.25+.08)
                pixels[x,y]=tuple(round(c+(215-c)*chalk+(n-.5)*10) for c in (152,91,61))
        atlases['color'].paste(tile_image(clay),(CELL,CELL))
        atlases['normal'].paste(tile_image(Image.new('RGB',(INNER,INNER),(128,128,255))),(CELL,CELL))
        atlases['properties'].paste(tile_image(Image.new('RGB',(INNER,INNER),(255,238,0))),(CELL,CELL))
        asset=production['rubber-plant'];r0,r1,z0,z1=.062,.083,.014,.144;segments=12
        for i in range(segments):
            corners=[]
            for step,ring in [(i,0),(i+1,0),(i+1,1),(i,1)]:
                a=step/segments*2*math.pi;r=[r0,r1][ring];z=[z0,z1][ring];n=[math.cos(a),math.sin(a),-(r1-r0)/(z1-z0)];length=math.sqrt(sum(c*c for c in n));n=[c/length for c in n]
                corners.append([r*math.cos(a),r*math.sin(a),z,*n,*uvpoint(step/segments,ring,3)])
            asset['faces'].extend([[corners[i].copy() for i in indices] for indices in [(0,1,2),(0,2,3)]])
        asset['repairs']=['Added missing pot wall: 24 triangles, local terracotta material','Separated opposing leaf skins by 1.4mm']
    for name in names:
        asset=production[name];vertices=[v for f in asset['faces'] for v in f]
        asset['min']=[min(v[i] for v in vertices) for i in range(3)];asset['max']=[max(v[i] for v in vertices) for i in range(3)];asset['size']=[b-a for a,b in zip(asset['min'],asset['max'])]
        asset['width']=2*max(abs(asset['min'][0]),abs(asset['max'][0]));asset['drop']=max(0,-asset['min'][2]);asset['triangles']=len(asset['faces'])
        for face in asset['faces']:
            repair_normals(face)
            for v in face:
                x=min(SIZE-1,max(0,round(v[6]*(SIZE-1))));y=min(SIZE-1,max(0,round((1-v[7])*(SIZE-1))))
                v[8:]=[linear(c) for c in atlases['color'].getpixel((x,y))];v[:]=[round(c,7) for c in v]
    for channel,atlas in atlases.items():
        suffix='' if channel=='color' else '-'+channel
        path=ROOT/f'src/materials/library/balcony-{group}{suffix}.png';atlas.save(path)
        outputs[str(path.relative_to(ROOT))]=hashlib.sha256(path.read_bytes()).hexdigest()
out=ROOT/'src/dressing/kowloon/assets/balcony-props.json';out.parent.mkdir(exist_ok=True);out.write_text(json.dumps(production,separators=(',',':'))+'\n')
outputs[str(out.relative_to(ROOT))]=hashlib.sha256(out.read_bytes()).hexdigest()
(PROJECT/'production.json').write_text(json.dumps({'atlasSize':[SIZE,SIZE],'cellSize':CELL,'padding':PAD,'outputs':outputs,'assets':{name:{k:v for k,v in a.items() if k!='faces'} for name,a in production.items()}},indent=2)+'\n')
print('Packed',[(n,a['triangles']) for n,a in production.items()])
