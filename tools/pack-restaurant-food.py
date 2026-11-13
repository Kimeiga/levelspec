"""Pack food UVs and matched PBR maps; chicken variants share geometry and adjust only cooked-skin albedo."""
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT=Path.cwd()
SOURCE=ROOT/'generated/restaurant-props/food-bake'
catalog=json.loads((SOURCE/'catalog.json').read_text())
atlases={name:Image.new('RGB',(1024,1024),fill) for name,fill in
         [('color',(150,110,60)),('normal',(128,128,255)),('properties',(255,150,0))]}


def linear(value):
    """Decode sRGB for vertex-color fallbacks."""
    value/=255
    return value/12.92 if value<=.04045 else ((value+.055)/1.055)**2.4


for tile, name in enumerate(['chicken','chicken','chicken','slices']):
    for channel, atlas in atlases.items():
        path=SOURCE/f'{name}-{channel}'
        small=Image.open(path).convert('RGB').resize((504,504),Image.Resampling.LANCZOS) if path.exists() else Image.new('RGB',(504,504),{'color':(150,110,60),'normal':(128,128,255),'properties':(255,150,0)}[channel])
        pixels=small.load()
        for y in range(504):
            for x in range(504):
                r,g,b=pixels[x,y]
                if channel=='color' and tile==1:
                    pixels[x,y]=(min(255,round(r*.94+14)),min(255,round(g*1.17+10)),min(255,round(b*1.08+5)))
                elif channel=='color' and tile==2:
                    pixels[x,y]=(round(r*.84),round(g*.70),round(b*.64))
                elif channel=='color' and name=='slices':
                    crust=max(0,min(1,((r-g)/max(r,1)-.16)/.30))
                    pixels[x,y]=(round(r*(1-.45*crust)),round(g*(1-.40*crust)),round(b*(.85-.45*crust)))
                elif channel=='properties':
                    pixels[x,y]=(255,max(125,g),0)
        padded=Image.new('RGB',(512,512));padded.paste(small,(4,4))
        for i in range(4):
            padded.paste(small.crop((0,0,504,1)),(4,i))
            padded.paste(small.crop((0,503,504,504)),(4,508+i))
        for i in range(4):
            padded.paste(padded.crop((4,0,5,512)),(i,0))
            padded.paste(padded.crop((507,0,508,512)),(508+i,0))
        atlas.paste(padded,(tile%2*512,tile//2*512))
for name,asset in catalog.items():
    tile=0 if name=='chicken' else 3
    image=atlases['color']
    for face in asset['faces']:
        for vertex in face:
            u,v=vertex[6:8]
            uv=[(tile%2*512+4+u*504)/1024,1-(tile//2*512+4+(1-v)*504)/1024]
            x=min(1023,max(0,round(uv[0]*1023)))
            y=min(1023,max(0,round((1-uv[1])*1023)))
            vertex[6:]=[*uv,*[linear(c) for c in image.getpixel((x,y))]]
            vertex[:]=[round(value,7) for value in vertex]
    asset['size']=[round(value,7) for value in asset['size']]
    asset['anchor']=[round(value,7) for value in asset['anchor']]
path=ROOT/'src/dressing/kowloon/shop/assets/restaurant-food.json'
path.write_text(json.dumps(catalog,separators=(',',':'))+'\n')
outputs={str(path.relative_to(ROOT)):hashlib.sha256(path.read_bytes()).hexdigest()}
for channel,image in atlases.items():
    suffix='' if channel=='color' else '-'+channel
    path=ROOT/f'projects/dressing-demo/textures/restaurant-food{suffix}.png'
    image.save(path);outputs[str(path.relative_to(ROOT))]=hashlib.sha256(path.read_bytes()).hexdigest()
(ROOT/'projects/kowloon-restaurant-props/food-production.json').write_text(json.dumps({'outputs':outputs,'textureSize':[1024,1024],'padding':4,'variants':['amber','golden','mahogany'],'metalness':0,'minimumRoughness':125/255},indent=2)+'\n')
