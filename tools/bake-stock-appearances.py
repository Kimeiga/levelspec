"""Bake brand/color variants into spare atlas tiles without adding runtime materials.

Generated label art is projected onto existing front-facing UV islands. Geometry,
normal maps and material-property maps remain shared across product appearances.
"""
import colorsys
import json
import math
import random
import subprocess
import sys
from pathlib import Path
from PIL import Image, ImageDraw

ROOT=Path.cwd()
PROJECT=ROOT/'projects/kowloon-liquor-props'
ASSETS=ROOT/'src/dressing/kowloon/shop/assets'
TEXTURES=ROOT/'projects/dressing-demo/textures'
SIZE=248
catalog=json.loads((ASSETS/'grocer-props.json').read_text())
channels={channel:Image.open(TEXTURES/f'grocer-props{suffix}.png').convert('RGB')
          for channel,suffix in [('color',''),('normal','-normal'),('properties','-properties')]}
art=Image.open(PROJECT/'materials/packaging-labels.png').convert('RGB')
labels=[art.crop((i%4*art.width//4,i//4*art.height//2,(i%4+1)*art.width//4,(i//4+1)*art.height//2)).resize((256,256)) for i in range(8)]
metadata={}


def rect(x,y,width,height=None):
    """Convert a top-origin pixel rectangle into lower-origin normalized atlas UVs."""
    height = width if height is None else height
    return [x/2560,1-(y+height)/2048,(x+width)/2560,1-y/2048]


def tile_rect(tile):
    """The existing full-resolution source tile excludes its gutter."""
    return rect(tile%5*512+4,tile//5*512+4,504)


def linear(value):
    """Decode albedo for textureless fallback colors."""
    value/=255
    return value/12.92 if value<=.04045 else ((value+.055)/1.055)**2.4


def recolor(image,index,material=None):
    """Change chromatic packaging/lids while retaining neutral paper, metal and shading."""
    hues=[.38,.61,.13,.075,.97,.48,.08,.60]
    warm_stock=material in ['seasoning-jar','drink-bottle']
    if warm_stock:
        hues=[.008,.975,.045,.085,.13,.37,.61,.49]
    result=Image.new('RGB',image.size)
    output=[]
    for r,g,b in image.getdata():
        h,s,v=colorsys.rgb_to_hsv(r/255,g/255,b/255)
        if s>.22:
            saturation=min(.88,s*.98) if warm_stock else s*.12 if index in [3,7] else min(.72,s*.82)
            if material=="bottle-crate": saturation*=.6
            if warm_stock:
                v=min(1,v*[1.10,.72,.85,1.02,1.08,.88,.86,.88][index])
            else:
                v=min(1,v*(1.16 if index==3 else 1.02))
                if index==4: v*=.7
                if index==7: v*=.5
            if material=="bottle-crate": v*=.76
            r,g,b=colorsys.hsv_to_rgb(hues[index],saturation,v)
            output.append((round(r*255),round(g*255),round(b*255)))
        else: output.append((r,g,b))
    result.putdata(output)
    return result


def stock_label(design,index,material):
    """Give jar/bottle labels substantial matching colored ink and bands, preserving central printed art."""
    image=recolor(labels[design],index,material)
    colors=[(173,42,29),(105,24,43),(156,65,29),(179,104,29),
            (182,153,35),(36,105,62),(37,64,123),(31,111,111)]
    draw=ImageDraw.Draw(image)
    draw.rectangle((0,0,255,17),fill=colors[index])
    draw.rectangle((0,238,255,255),fill=colors[index])
    draw.rectangle((0,0,255,255),outline=colors[index],width=6)
    return image


def label_projection(asset,source,band):
    """Rasterize the label band once using UV barycentrics and real front-facing geometry."""
    result={}
    width,_,height=asset['size']
    for face in asset['faces']:
        if sum(vertex[4] for vertex in face)/3 > -.2: continue
        uv=[((v[6]-source[0])/(source[2]-source[0])*(SIZE-1),
             (1-(v[7]-source[1])/(source[3]-source[1]))*(SIZE-1)) for v in face]
        (ax,ay),(bx,by),(cx,cy)=uv
        denominator=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy)
        if abs(denominator)<1e-8: continue
        for y in range(max(0,math.floor(min(p[1] for p in uv))),min(SIZE,math.ceil(max(p[1] for p in uv))+1)):
            for x in range(max(0,math.floor(min(p[0] for p in uv))),min(SIZE,math.ceil(max(p[0] for p in uv))+1)):
                a=((by-cy)*(x-cx)+(cx-bx)*(y-cy))/denominator
                b=((cy-ay)*(x-cx)+(ax-cx)*(y-cy))/denominator
                c=1-a-b
                if min(a,b,c)<-1e-6: continue
                px=sum(weight*v[0] for weight,v in zip([a,b,c],face))
                pz=sum(weight*v[2] for weight,v in zip([a,b,c],face))/height
                u=.5+px/(width*.86)
                v=(pz-band[0])/(band[1]-band[0])
                if 0<=u<=1 and 0<=v<=1: result[x,y]=(round(u*255),round((1-v)*255))
    return result


def fallback(asset,image,source):
    """Sample the packed variant using source UVs; geometry/normals are not duplicated."""
    width,height=image.size
    return [[[round(linear(c),6) for c in image.getpixel((
        min(width-1,max(0,round((v[6]-source[0])/(source[2]-source[0])*(width-1)))),
        min(height-1,max(0,round((1-(v[7]-source[1])/(source[3]-source[1]))*(height-1))))))]
        for v in face] for face in asset['faces']]


def packed_color(uv):
    """Read the actual packed albedo at its final texel density for fallback sampling."""
    u0,v0,u1,v1=uv
    return channels['color'].crop((round(u0*2560),round((1-v1)*2048),round(u1*2560),round((1-v0)*2048)))


def pack(tile,index,images,count=4):
    """Pack four/eight matching PBR variants into one tile, each with four-pixel gutters."""
    columns=4 if count==8 else 2
    width,height=512//columns,256
    inner_width,inner_height=width-8,height-8
    x=tile%5*512+(index%columns)*width
    y=tile//5*512+(index//columns)*height
    for channel,image in images.items():
        image=image.resize((inner_width,inner_height),Image.Resampling.LANCZOS)
        padded=Image.new('RGB',(width,height))
        padded.paste(image,(4,4))
        for edge in range(4):
            padded.paste(image.crop((0,0,inner_width,1)),(4,edge))
            padded.paste(image.crop((0,inner_height-1,inner_width,inner_height)),(4,height-4+edge))
        for edge in range(4):
            padded.paste(padded.crop((4,0,5,height)),(edge,0))
            padded.paste(padded.crop((width-5,0,width-4,height)),(width-4+edge,0))
        channels[channel].paste(padded,(x,y))
    return rect(x+4,y+4,inner_width,inner_height)


def bake_pouches():
    """Refresh only the separate pouch atlas without reprojecting unrelated shop artwork."""
    # The independent pouch atlas keeps four full-size printed variants in one texture.
    base=Image.open(PROJECT/'materials/snack-packet-base.png').convert('RGB').resize((512,512))
    pouches=Image.new('RGB',(1024,1024))
    for index,design in enumerate([2,4,0,7]):
        image=recolor(base,index)
        image.paste(labels[design].resize((350,350),Image.Resampling.LANCZOS),(81,81))
        inner=image.resize((504,504),Image.Resampling.LANCZOS)
        padded=Image.new('RGB',(512,512))
        padded.paste(inner,(4,4))
        for edge in range(4):
            padded.paste(inner.crop((0,0,504,1)),(4,edge))
            padded.paste(inner.crop((0,503,504,504)),(4,508+edge))
        for edge in range(4):
            padded.paste(padded.crop((4,0,5,512)),(edge,0))
            padded.paste(padded.crop((507,0,508,512)),(508+edge,0))
        pouches.paste(padded,((index%2)*512,(index//2)*512))
    pouches.save(TEXTURES/'snack-packet.png')


if "--pouches-only" in sys.argv:
    bake_pouches()
    raise SystemExit(0)


specs=[('seasoning-jar',12,13,(.18,.68),[7,5,3,2,6,0,1,4]),('food-tin',6,14,(.1,.88),[6,1,2,7]),
       ('tea-carton',7,15,(.06,.94),[0,4,2,5]),('drink-bottle',5,16,(.16,.55),[7,5,3,2,6,0,1,4]),
       ('rice-sack',0,17,(.22,.65),[6,4,2,5]),('bottle-crate',4,18,None,[0,1,2,5])]
for name,tile,destination,band,designs in specs:
    source=tile_rect(tile)
    x,y=tile%5*512+4,tile//5*512+4
    originals={channel:image.crop((x,y,x+504,y+504)).resize((SIZE,SIZE),Image.Resampling.LANCZOS) for channel,image in channels.items()}
    projection=label_projection(catalog[name],source,band) if band else {}
    variants=[]
    for index,design in enumerate(designs):
        image=originals['color'].copy() if name=='rice-sack' else recolor(originals['color'],index,name)
        label_art=stock_label(design,index,name) if name in ['seasoning-jar','drink-bottle'] else labels[design]
        for point,sample in projection.items():
            label=label_art.getpixel(sample)
            value=max(originals['color'].getpixel(point))/255
            image.putpixel(point,tuple(round(c*(.82+.18*value)) for c in label))
        uv=pack(destination,index,{**originals,'color':image},len(designs))
        variants.append({'uv':uv,'colors':fallback(catalog[name],packed_color(uv),source)})
    metadata[name]={'source':source,'variants':variants}
    alias={'rice-sack':'dry-goods-bag','drink-bottle':'bottle-load'}.get(name)
    if alias in catalog:
        metadata[alias]={'source':source,'variants':[
            {'uv':variant['uv'],'colors':fallback(catalog[alias],packed_color(variant['uv']),source)}
            for variant in variants]}

# Closed shipping cartons are cheap regular geometry with printed paper and tape.
box_source=rect(4*512+4,3*512+4,SIZE)
points=[[-.15,-.1,0],[.15,-.1,0],[.15,.1,0],[-.15,.1,0],[-.15,-.1,.18],[.15,-.1,.18],[.15,.1,.18],[-.15,.1,.18]]
faces=[]
for corners,normal in [([0,4,7,3],[-1,0,0]),([1,2,6,5],[1,0,0]),([0,1,5,4],[0,-1,0]),([3,7,6,2],[0,1,0]),([0,3,2,1],[0,0,-1]),([4,5,6,7],[0,0,1])]:
    uv=[(0,0),(1,0),(1,1),(0,1)]
    # Side faces use Z as V so their printing stands upright.
    vertices=[]
    for index,(u,v) in zip(corners,uv):
        p=points[index]
        if normal[2]==0:
            u=(p[1]+.1)/.2 if normal[0] else (p[0]+.15)/.3
            if normal[0]<0 or normal[1]>0: u=1-u
            v=p[2]/.18
        vertices.append([*p,*normal,box_source[0]+u*(box_source[2]-box_source[0]),box_source[1]+v*(box_source[3]-box_source[1]),.5,.4,.25])
    faces.extend([[vertices[0][:],vertices[1][:],vertices[2][:]],[vertices[0][:],vertices[2][:],vertices[3][:]]])
box={'size':[.3,.2,.18],'faces':faces}
variants=[]
for index,design in enumerate([4,0,2,5]):
    image=Image.new('RGB',(SIZE,SIZE))
    rng=random.Random(312+index)
    image.putdata([tuple(base+rng.randint(-5,5) for base in (171+index*5,141+index*4,99+index*4)) for _ in range(SIZE*SIZE)])
    image.paste(labels[design].resize((180,165),Image.Resampling.LANCZOS),(34,42))
    ImageDraw.Draw(image).rectangle((118,0,129,25),fill=(126,100,67))
    uv=pack(19,index,{'color':image,'normal':Image.new('RGB',(SIZE,SIZE),(128,128,255)),'properties':Image.new('RGB',(SIZE,SIZE),(255,220,0))})
    variants.append({'uv':uv,'colors':fallback(box,image,box_source)})
for face,colors in zip(box['faces'],variants[0]['colors']):
    for vertex,color in zip(face,colors): vertex[8:]=color
catalog['stock-box']=box
metadata['stock-box']={'source':box_source,'variants':variants}
for channel,image in channels.items():
    suffix='' if channel=='color' else '-'+channel
    image.save(TEXTURES/f'grocer-props{suffix}.png')
(ASSETS/'grocer-props.json').write_text(json.dumps(catalog,separators=(',',':'))+'\n')
(ASSETS/'stock-appearances.json').write_text(json.dumps(metadata,separators=(',',':'))+'\n')

bake_pouches()
print("Packed shared appearances and four pouch labels; atlas dimensions unchanged.")

subprocess.run(["python3",str(ROOT/"tools/bake-bag-clusters.py")],check=True)

subprocess.run(["python3",str(ROOT/"tools/bake-clean-stock.py")],check=True)
