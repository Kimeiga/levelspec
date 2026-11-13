"""Map generated shop materials onto approved meshes and a regular reusable produce crate.

Run after bake-liquor-props.py. Only the stool/crate atlas tiles are replaced;
all three material channels keep the shared atlas and four-pixel gutters.
"""
import json
import math
from pathlib import Path
from PIL import Image, ImageFilter

ROOT = Path.cwd()
PROJECT = ROOT / 'projects/kowloon-liquor-props'
ASSET = ROOT / 'src/dressing/kowloon/shop/assets/grocer-props.json'
TEXTURES = ROOT / 'projects/dressing-demo/textures'
catalog = json.loads(ASSET.read_text())
source = json.loads((ROOT / 'generated/liquor-props/bake/catalog.json').read_text())


def linear(value):
    """Convert a sampled albedo channel into the renderer's linear fallback."""
    value /= 255
    return value/12.92 if value <= .04045 else ((value+.055)/1.055)**2.4


def maps(image, roughness):
    """Derive restrained grain relief and roughness from albedo, not measured PBR data."""
    color = image.convert('RGB').resize((504,504), Image.Resampling.LANCZOS)
    height = color.convert('L').filter(ImageFilter.GaussianBlur(.6))
    pixels = height.load()
    normal = Image.new('RGB', color.size)
    properties = Image.new('RGB', color.size)
    for y in range(504):
        for x in range(504):
            dx = (pixels[(x+1)%504,y]-pixels[(x-1)%504,y])*.002
            dy = (pixels[x,(y+1)%504]-pixels[x,(y-1)%504])*.002
            length = math.sqrt(dx*dx+dy*dy+1)
            normal.putpixel((x,y),(round(127.5-127.5*dx/length),round(127.5+127.5*dy/length),round(127.5+127.5/length)))
            properties.putpixel((x,y),(255, max(0,min(255,round(roughness+(pixels[x,y]-110)*.18))),0))
    return {'color':color,'normal':normal,'properties':properties}


def pack(tile, channels):
    """Replace one padded tile, preserving all unrelated atlas pixels."""
    for channel, small in channels.items():
        suffix = '' if channel == 'color' else '-'+channel
        path = TEXTURES / f'grocer-props{suffix}.png'
        atlas = Image.open(path).convert('RGB')
        padded = Image.new('RGB',(512,512))
        padded.paste(small,(4,4))
        for i in range(4):
            padded.paste(small.crop((0,0,504,1)),(4,i))
            padded.paste(small.crop((0,503,504,504)),(4,508+i))
        for i in range(4):
            padded.paste(padded.crop((4,0,5,512)),(i,0))
            padded.paste(padded.crop((507,0,508,512)),(508+i,0))
        atlas.paste(padded,(tile%5*512,tile//5*512))
        atlas.save(path)


def corner(point, normal, u, v, tile, image):
    """Keep generated material coordinates inside a single shared atlas tile."""
    u,v = max(.01,min(.99,u)),max(.01,min(.99,v))
    color = image.getpixel((round(u*503),round((1-v)*503)))
    return [*point,*normal,(tile%5*512+4+u*504)/2560,((3-tile//5)*512+4+v*504)/2048,*map(linear,color)]


wood = maps(Image.open(PROJECT/'materials/worn-shop-wood.png'),205)
plastic = maps(Image.open(PROJECT/'materials/worn-crate-plastic.png'),175)
for name, channels in [('shop-stool',wood),('bottle-crate',plastic)]:
    asset = catalog[name]
    tile = source[name]['tile']
    pack(tile,channels)
    size = asset['size']
    faces = []
    for face in asset['faces']:
        normal = [sum(vertex[axis+3] for vertex in face)/3 for axis in range(3)]
        dominant = max(range(3),key=lambda axis:abs(normal[axis]))
        horizontal = 1 if dominant == 0 else 0
        for vertex in face:
            x,y,z = vertex[:3]
            if name == 'shop-stool' and z > size[2]*.78:
                u,v = .5+y/size[1]*.9,.5+x/size[0]*.9
            elif dominant == 2:
                u,v = .5+x/size[0]*.9,.5+y/size[1]*.9
            else:
                u,v = .5+vertex[horizontal]/size[horizontal]*.9,.04+z/size[2]*.92
            vertex[:] = corner(vertex[:3],vertex[3:6],u,v,tile,channels['color'])
        faces.append(face)
    asset['faces'] = faces

# One shallow crate has continuous load-bearing floor slats, side rails and corner battens.
faces = []
tile = source['shop-stool']['tile']
wood_color = wood['color']
BOX_FACES = [(0,4,7,3),(1,2,6,5),(0,1,5,4),(3,7,6,2),(0,3,2,1),(4,5,6,7)]
NORMALS = [(-1,0,0),(1,0,0),(0,-1,0),(0,1,0),(0,0,-1),(0,0,1)]


def board(low, high):
    """Map grain along each plank's long axis, with different crops per plank."""
    span = [high[i]-low[i] for i in range(3)]
    length = max(range(3),key=lambda i:span[i])
    points = [(low[0],low[1],low[2]),(high[0],low[1],low[2]),(high[0],high[1],low[2]),(low[0],high[1],low[2]),
              (low[0],low[1],high[2]),(high[0],low[1],high[2]),(high[0],high[1],high[2]),(low[0],high[1],high[2])]
    crop = (len(faces)*.017)% .2
    for indices,normal in zip(BOX_FACES,NORMALS):
        across = next(i for i in range(3) if i != length and abs(normal[i]) < .5)
        along = length if abs(normal[length]) < .5 else next(i for i in range(3) if i != across and abs(normal[i]) < .5)
        corners = [corner(points[i],normal,.05+crop+(points[i][across]-low[across])/span[across]*.65,
                          .04+(points[i][along]-low[along])/span[along]*.9,tile,wood_color) for i in indices]
        faces.extend([[corners[0][:],corners[1][:],corners[2][:]],[corners[0][:],corners[2][:],corners[3][:]]])


for row in range(3):
    y = -.155+row*.103333
    board([-.2,y,0],[.2,y+.103333,.014])
for z in [.014,.045]:
    for y in [-.155,.143]: board([-.2,y,z],[.2,y+.012,z+.026])
    for x in [-.2,.188]: board([x,-.143,z],[x+.012,.143,z+.026])
for x in [-.2,.182]:
    for y in [-.155,.137]: board([x,y,.014],[x+.018,y+.018,.071])
fasteners = []
for y,normal in [(-.15501,[0,-1,0]),(.15501,[0,1,0])]:
    for x in [-.188,.188]:
        for z in [.026,.058]:
            points = [[x-.002,y,z-.002],[x+.002,y,z-.002],[x+.002,y,z+.002],[x-.002,y,z+.002]]
            if y > 0: points.reverse()
            vertices = [[*point,*normal,0,0,.12,.13,.12] for point in points]
            fasteners.extend([[vertices[0][:],vertices[1][:],vertices[2][:]],[vertices[0][:],vertices[2][:],vertices[3][:]]])
catalog['produce-crate'] = {'size':[.4,.31002,.071],'faces':faces,'paintedFaces':fasteners}
ASSET.write_text(json.dumps(catalog,separators=(',',':'))+'\n')
print('Refined stool and red crate materials; produce-crate:',len(faces),'triangles')
